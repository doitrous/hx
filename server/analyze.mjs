// The Jev pipeline: turns a note into bundle probabilities and field states/values.
// See docs/CONTRACT.md for the wire shapes. Reused wording (trigger/item criteria) comes
// verbatim from trial/logic.js, which was tested against the real model.
import { splitClauses, scrubName } from "./sentences.mjs";
import { createHash } from "node:crypto";
import { extractCandidates, unitOf } from "./extract.mjs";

// A value judged for (field, evidence sentence) never changes, so ask Jev once. Without this every
// analyze() re-asked each Present/Absent and number choice and paid a second round trip per keystroke pause.
// Keys are hashes, so no note text is retained. ponytail: per-process FIFO; move to Redis if we run >1 instance.
const VALUE_CACHE_MAX = 100_000; // small strings and numbers: a few MB at most
const CLAUSE_LISTS_MAX = 2000; // one list of clause hashes per analysed text, about 3 KB each
const clauseLists = new Map();
const valueCache = new Map();
const valueKey = (bundle, item, sentenceText) => createHash("sha256").update(`${bundle.id}.${item.id}|${item.type}|${sentenceText}`).digest("base64");
export const clearValueCache = () => { valueCache.clear(); clauseLists.clear(); };
function rememberValue(key, value) {
  if (valueCache.size >= VALUE_CACHE_MAX) valueCache.delete(valueCache.keys().next().value);
  valueCache.set(key, value);
}

// Calibration knobs. Tune these against real notes.
export const THRESHOLDS = {
  FIRE: 0.5, // trigger probability at which a bundle opens
  TICK: 0.7, // item probability that counts as "filled"
  MAYBE: 0.4, // between MAYBE and TICK -> "unclear", below MAYBE -> "empty"
  PRESENCE: 0.5, // presence-noul probability that counts as "Present" rather than "Absent"
};

const LEAN_RULES = "Judge every question against `note` only. A condition applies only if the note says it of the patient themself: something denied, not mentioned, or true only of a relative does not apply. A point counts as documented when the note addresses it at all: stating that it is absent, normal, none or unknown counts, and so does giving a value.";
const TRIGGER_WORDS_MAX = 28; // words of a clause offered when narrowing a trigger to its keyword
const TRIGGER_SPAN_WORDS = 4;
const RECENT_SENTENCES_MAX = 60; // caps the cost of the evidence-choice question

const TRIGGER_CRITERIA = {
  true: "The note says this applies to the patient themself as part of this presentation or their own medical background.",
  false: "It is not mentioned, it is explicitly denied, or it applies only to a relative or someone else.",
};
const ITEM_CRITERIA = {
  true: "The note addresses this point. Stating that it is absent, normal, none or unknown counts, and so does giving a value.",
  false: "The note does not address this point at all.",
};
const PRESENCE_CRITERIA = {
  true: "It is present in the patient.",
  false: "It is denied, absent, or this sentence does not address it.",
};

const fieldState = (p) => (p >= THRESHOLDS.TICK ? "filled" : p >= THRESHOLDS.MAYBE ? "unclear" : "empty");

// "... or its absence" / "... or their absence" is redundant once we ask present-vs-absent directly.
const stripAbsenceSuffix = (phrase) => phrase.replace(/,?\s*or (?:its|their) absence$/i, "");

// Question ids just need to be unique and match [a-zA-Z0-9_]; a counter avoids ever having to
// encode/decode bundle and item ids (which already contain underscores) into the id string.
// The manifest carries what each id means, for reading the answers back out.
function questionBatch() {
  const questions = {};
  const manifest = new Map();
  let n = 0;
  return {
    questions,
    manifest,
    get size() {
      return n;
    },
    add(question, meta) {
      const id = `q${n++}`;
      questions[id] = question;
      manifest.set(id, meta);
      return id;
    },
  };
}

// Trigger-only judgment for the evaluation harness (server/eval). Same rules, state and wording as analyze(),
// one Jev call, no items: this is what decides whether a bundle opens.
const CATCH_ALL = "named_diagnosis";

export async function judgeTriggers({ mode, text }, { jev, bundles }) {
  const questions = {};
  const ids = [];
  for (const b of bundles.forMode(mode)) if (b.trigger) { questions[`q${ids.length}`] = { type: "noul", instructions: b.trigger }; ids.push(b.id); }
  const { answers } = await jev.ask({ state: { rules: LEAN_RULES, note: text }, questions });
  return Object.fromEntries(ids.map((id, i) => [id, answers[`q${i}`]?.noul ?? 0]));
}

export async function analyze({ mode, text, open = [], locked = [], known = {}, prevHash }, { jev, bundles, patientName }) {
  const t0 = performance.now();
  let calls = 0;
  let tokens = 0;

  // "Sentences" below are clauses: the unit of evidence a field cites. See splitClauses.
  const originalSentences = splitClauses(text);
  const scrubbedSentences = originalSentences.map((s) => ({ ...s, text: scrubName(s.text, patientName) }));
  // Cost is driven by question text, and the judging rules were half of every question. Saying them once in the
  // state cut billed tokens by about 64% with the same bundles opening on the test notes (only borderline fields
  // moved, in both directions). ANALYZE_LEAN=0 restores per-question criteria for comparison runs.
  const LEAN = process.env.ANALYZE_LEAN !== "0";
  const noteForJev = scrubName(text, patientName); // Jev reads the note with its punctuation intact
  const state = LEAN ? { rules: LEAN_RULES, note: noteForJev } : noteForJev;
  const clausesHash = createHash("sha256").update(scrubbedSentences.map((c) => c.text).join("\n")).digest("base64");
  const lockedSet = new Set(locked);
  const modeBundles = bundles.forMode(mode);

  const send = async (batch) => {
    if (!batch.size) return new Map();
    if (LEAN) for (const q of Object.values(batch.questions)) if (q.type === "noul" && (q.criteria === TRIGGER_CRITERIA || q.criteria === ITEM_CRITERIA)) delete q.criteria;
    calls++;
    const tripStart = performance.now();
    const { answers, usage } = await jev.ask({ state, questions: batch.questions });
    const tripMs = Math.round(performance.now() - tripStart);
    tokens += usage?.input_tokens || 0; // output tokens are not billed
    if (process.env.ANALYZE_DEBUG) {
      const kinds = {};
      for (const m of batch.manifest.values()) kinds[m.kind] = (kinds[m.kind] || 0) + 1;
      console.error(`  jev trip: ${tripMs}ms n=${batch.size} in=${usage?.input_tokens} out=${usage?.output_tokens} stateChars=${JSON.stringify(state).length} questionChars=${JSON.stringify(batch.questions).length}`, JSON.stringify(kinds));
    }
    return new Map(Object.entries(answers));
  };

  // ---------- Evidence + value helpers (shared by both waves of fields) ----------

  function evidenceChoiceQuestion(item, bundle, candidateIndices) {
    const recent = candidateIndices.slice(-RECENT_SENTENCES_MAX);
    const criteria = { none: "No sentence documents it" };
    const keyForIndex = new Map();
    for (const i of recent) {
      const key = `s${i}`;
      criteria[key] = scrubbedSentences[i].text;
      keyForIndex.set(key, i);
    }
    return {
      question: {
        type: "choice",
        instructions: `Which sentence of the note documents ${item.phrase} regarding ${bundle.about}?`,
        criteria,
      },
      keyForIndex,
    };
  }

  function presenceQuestion(item, sentenceIndex) {
    const phrase = stripAbsenceSuffix(item.phrase);
    const sentenceText = scrubbedSentences[sentenceIndex].text;
    return {
      type: "noul",
      instructions: `In the sentence "${sentenceText}", ${phrase} is present in the patient (as opposed to denied or absent).`,
      criteria: PRESENCE_CRITERIA,
    };
  }

  function candidateChoiceQuestion(item, bundle, candidates, clauseText) {
    // The clause gives each number its meaning. Offered a bare "20", Jev accepted a 20 French drain size as a drain count.
    const criteria = { none: `None of these is ${item.phrase}. They measure something else.` };
    const keyForCandidate = new Map();
    candidates.forEach((c, i) => {
      const key = `c${i}`;
      criteria[key] = c;
      keyForCandidate.set(key, c);
    });
    return {
      question: {
        type: "choice",
        instructions: `In the clause "${clauseText}", which value is ${item.phrase} regarding ${bundle.about}?`,
        criteria,
      },
      keyForCandidate,
    };
  }

  // Adds whatever question(s) are needed to derive the value from a known evidence sentence,
  // or resolves it immediately in code when no judgment call is needed.
  function beginValue(item, bundle, sentenceIndex, batch, tripTag) {
    if (item.type === "text") return { resolved: true, value: originalSentences[sentenceIndex].text };
    const cacheKey = valueKey(bundle, item, scrubbedSentences[sentenceIndex].text);
    if (valueCache.has(cacheKey)) return { resolved: true, value: valueCache.get(cacheKey) };
    if (item.type === "presence") {
      const id = batch.add(presenceQuestion(item, sentenceIndex), { kind: "presence" });
      return { presenceQuestionId: id, tripTag, cacheKey };
    }
    // number / "number <unit>" / bp / duration: code finds candidates, Jev only disambiguates.
    const candidates = extractCandidates(item.type, originalSentences[sentenceIndex].text);
    if (candidates.length === 0) return { resolved: true, value: null };
    // A lone number is not proof: "a 20 French drain" is a size, not a drain count. Jev confirms it or
    // answers "none". The value cache makes this a one-time question per (field, clause).
    const { question, keyForCandidate } = candidateChoiceQuestion(item, bundle, candidates, scrubbedSentences[sentenceIndex].text);
    const id = batch.add(question, { kind: "candidate" });
    return { candidateQuestionId: id, keyForCandidate, tripTag, cacheKey };
  }

  // Starts resolving one field: reuse a still-valid known sentence with no Jev call, or ask
  // which sentence documents it.
  function beginField(fieldKey, bundle, item, batch, tripTag) {
    const base = { fieldKey, bundle, item };
    const knownSentence = known[fieldKey];
    if (typeof knownSentence === "string") {
      const sentenceIndex = originalSentences.findIndex((s) => s.text === knownSentence);
      if (sentenceIndex !== -1) return { ...base, sentenceIndex, ...beginValue(item, bundle, sentenceIndex, batch, tripTag) };
    }
    // Evidence questions are the expensive ones: each offers Jev the clauses as options. So a field is only ever
    // offered clauses it has not already turned down. Once it rejected the note as it stood (it was empty, or Jev
    // answered "none"), and nothing was deleted since, only the newly added clauses can be its evidence.
    const noneKey = `rej|${fieldKey}|${clausesHash}`;
    if (valueCache.has(noneKey)) return { ...base, sentenceIndex: null, resolved: true, value: null };
    const rejectedBefore = nothingRemoved && valueCache.has(`rej|${fieldKey}|${prevHash}`);
    const candidateIndices = rejectedBefore ? addedIndices : originalSentences.map((_, i) => i);
    if (!candidateIndices.length) { rememberValue(noneKey, true); return { ...base, sentenceIndex: null, resolved: true, value: null }; }
    const { question, keyForIndex } = evidenceChoiceQuestion(item, bundle, candidateIndices);
    const id = batch.add(question, { kind: "evidence" });
    return { ...base, evidenceQuestionId: id, keyForIndex, noneKey };
  }

  // Reads the evidence-choice answer once it arrives. When `followUpBatch` is given, also
  // starts the value question in it (there is another trip to spend); otherwise resolves as
  // far as possible without another Jev call and leaves `value: null` when a judgment call
  // would be needed but the trip budget (<=3 per analyze()) is spent.
  // ponytail: that's a real ceiling, not a bug — the next analyze() call resolves it fully
  // once the bundle is part of `open`, at which point the field gets the full evidence+value budget.
  function finishEvidence(pending, answers, followUpBatch, followUpTripTag) {
    if (pending.sentenceIndex !== undefined) return pending; // resolved via `known`, nothing to do here
    const choice = answers.get(pending.evidenceQuestionId)?.choice;
    const sentenceIndex = choice && choice !== "none" ? pending.keyForIndex.get(choice) ?? null : null;
    if (choice === "none" && pending.noneKey) rememberValue(pending.noneKey, true);
    if (sentenceIndex === null) return { ...pending, sentenceIndex: null, resolved: true, value: null };
    if (followUpBatch) return { ...pending, sentenceIndex, ...beginValue(pending.item, pending.bundle, sentenceIndex, followUpBatch, followUpTripTag) };
    if (pending.item.type === "text") return { ...pending, sentenceIndex, resolved: true, value: originalSentences[sentenceIndex].text };
    if (pending.item.type === "presence") return { ...pending, sentenceIndex, resolved: true, value: null }; // needs a Jev call we don't have budget for
    const candidates = extractCandidates(pending.item.type, originalSentences[sentenceIndex].text);
    return { ...pending, sentenceIndex, resolved: true, value: candidates.length === 1 ? candidates[0] : null };
  }

  function finishValue(pending, answersB, answersC) {
    const value = judgeValue(pending, answersB, answersC);
    // Only a real Jev answer is remembered: a dropped answer must be asked again, not cached as "Absent".
    const asked = pending.presenceQuestionId ?? pending.candidateQuestionId;
    const answered = (pending.tripTag === "B" ? answersB : answersC).has(asked);
    if (!pending.resolved && pending.cacheKey && answered) rememberValue(pending.cacheKey, value);
    return value;
  }

  function judgeValue(pending, answersB, answersC) {
    if (pending.resolved) return pending.value;
    const answers = pending.tripTag === "B" ? answersB : answersC;
    if (pending.presenceQuestionId !== undefined) {
      const p = answers.get(pending.presenceQuestionId)?.noul ?? 0;
      return p >= THRESHOLDS.PRESENCE ? "Present" : "Absent";
    }
    if (pending.candidateQuestionId !== undefined) {
      const choice = answers.get(pending.candidateQuestionId)?.choice;
      return choice && choice !== "none" ? pending.keyForCandidate.get(choice) ?? null : null;
    }
    return null;
  }

  // ---------- What is already settled ----------
  // Cost is proportional to the number of questions, so the rule is: never ask what cannot have changed.
  // The client echoes the previous response's clausesHash as prevHash. From it we know whether text was
  // only ADDED since the last judgment. Clause hashes only: no note text is kept.
  const sha = (t) => createHash("sha256").update(t).digest("base64");
  const clauseHashes = scrubbedSentences.map((c) => sha(c.text));
  if (clauseLists.size >= CLAUSE_LISTS_MAX) clauseLists.delete(clauseLists.keys().next().value);
  clauseLists.set(clausesHash, clauseHashes);
  // Unknown prevHash (first call, server restart, evicted) simply means everything is asked.
  const prevClauses = prevHash ? clauseLists.get(prevHash) : undefined;
  const current = new Set(clauseHashes);
  const previous = new Set(prevClauses || []);
  const addedIndices = clauseHashes.map((h, i) => (previous.has(h) ? -1 : i)).filter((i) => i >= 0);
  const nothingRemoved = Boolean(prevClauses) && prevClauses.every((h) => current.has(h));
  // A closed bundle can only open on new text, and a bundle arriving mid-sentence is a distraction anyway.
  const atSentenceEnd = /[.!?\n]\s*$/.test(text);
  const askClosedTriggers = !nothingRemoved || atSentenceEnd;
  const carried = (key, fallback) => (valueCache.has(key) ? valueCache.get(key) : fallback);

  // ---------- Trip A: triggers that can have changed, plus unsettled items of bundles already open ----------

  const tripA = questionBatch();
  const bundleP = new Map();
  for (const b of modeBundles) {
    if (!b.trigger) continue;
    const isOpen = open.includes(b.id);
    // An open bundle stays open while nothing was deleted. A closed one is re-judged only at a sentence end.
    if (nothingRemoved && (isOpen || !askClosedTriggers)) { bundleP.set(b.id, carried(`p|t|${b.id}|${prevHash}`, isOpen ? 1 : 0)); continue; }
    tripA.add({ type: "noul", instructions: b.trigger, criteria: TRIGGER_CRITERIA }, { kind: "trigger", bundleId: b.id });
  }
  const itemP = new Map();
  for (const b of modeBundles) {
    if (!open.includes(b.id)) continue;
    for (const item of b.items) {
      const fieldKey = `${b.id}.${item.id}`;
      if (lockedSet.has(fieldKey)) continue;
      // A field already filled from a clause that is still in the note is still documented.
      const settledP = typeof known[fieldKey] === "string" ? valueCache.get(`p|i|${fieldKey}|${sha(scrubName(known[fieldKey], patientName))}`) : undefined;
      if (settledP >= THRESHOLDS.TICK && current.has(sha(scrubName(known[fieldKey], patientName)))) { itemP.set(fieldKey, settledP); continue; }
      tripA.add({ type: "noul", instructions: `Regarding ${b.about}: the note documents ${item.phrase}.`, criteria: ITEM_CRITERIA }, { kind: "item", fieldKey });
    }
  }
  const answersA = await send(tripA);

  for (const [id, meta] of tripA.manifest) if (meta.kind === "trigger") bundleP.set(meta.bundleId, answersA.get(id)?.noul ?? 0);
  for (const [id, p] of bundleP) rememberValue(`p|t|${id}|${clausesHash}`, p);
  const openNow = new Set(modeBundles.filter((b) => !b.trigger || bundleP.get(b.id) >= THRESHOLDS.FIRE).map((b) => b.id));
  const bundleResults = modeBundles.map((b) => ({ id: b.id, p: b.trigger ? bundleP.get(b.id) ?? 0 : 1, open: openNow.has(b.id) }));

  for (const [id, meta] of tripA.manifest) if (meta.kind === "item") itemP.set(meta.fieldKey, answersA.get(id)?.noul ?? 0);

  // ---------- Trip B: items of newly-opened bundles + evidence/value work for trip A's fields ----------

  const freshIds = [...openNow].filter((id) => !open.includes(id));
  const tripB = questionBatch();
  for (const id of freshIds) {
    const b = bundles.get(id);
    for (const item of b.items) {
      const fieldKey = `${id}.${item.id}`;
      if (!lockedSet.has(fieldKey)) tripB.add({ type: "noul", instructions: `Regarding ${b.about}: the note documents ${item.phrase}.`, criteria: ITEM_CRITERIA }, { kind: "item", fieldKey });
    }
  }
  // The catch-all "named diagnosis" bundle must not duplicate a disease that already has its own
  // bundle. Jev cannot say which disease fired it, so when it opens next to others we ask once,
  // naming those others, whether anything is left over for it.
  const covering = freshIds.includes(CATCH_ALL)
    ? [...openNow].map((id) => bundles.get(id)).filter((b) => b.trigger && b.id !== CATCH_ALL && b.kind === "history")
    : [];
  const leftoverId = covering.length
    ? tripB.add({
        type: "noul",
        instructions: `The note names a specific disease or diagnosis that the patient themself has or had, other than anything belonging under these headings: ${covering.map((b) => b.title).join("; ")}.`,
        criteria: TRIGGER_CRITERIA,
      }, { kind: "leftover" })
    : null;

  // What the note said that opened each new bundle, so the client can show what was caught. One clause
  // added since the last judgment is the answer for free. Otherwise ask, offering only the new clauses.
  const allIndices = scrubbedSentences.map((_, i) => i);
  const triggerPool = (nothingRemoved && addedIndices.length ? addedIndices : allIndices).slice(-RECENT_SENTENCES_MAX);
  const triggerClause = new Map(); // bundleId -> { index } | { questionId, keyForIndex }
  for (const id of freshIds) {
    const b = bundles.get(id);
    if (!b.trigger || !triggerPool.length) continue;
    if (triggerPool.length === 1) { triggerClause.set(id, { index: triggerPool[0] }); continue; }
    const criteria = { none: "No sentence shows it" };
    const keyForIndex = new Map();
    for (const i of triggerPool) { criteria[`s${i}`] = scrubbedSentences[i].text; keyForIndex.set(`s${i}`, i); }
    const questionId = tripB.add({ type: "choice", instructions: `Which sentence of the note is the one that shows this: ${b.trigger}`, criteria }, { kind: "triggerClause" });
    triggerClause.set(id, { questionId, keyForIndex });
  }

  const pendingA = [];
  for (const [fieldKey, p] of itemP) {
    if (lockedSet.has(fieldKey) || fieldState(p) === "empty") continue;
    const meta = bundles.field(fieldKey);
    if (meta) pendingA.push(beginField(fieldKey, meta.bundle, meta.item, tripB, "B"));
  }
  const answersB = await send(tripB);

  const suppressCatchAll = leftoverId != null && (answersB.get(leftoverId)?.noul ?? 1) < THRESHOLDS.FIRE;
  if (suppressCatchAll) {
    openNow.delete(CATCH_ALL);
    const r = bundleResults.find((b) => b.id === CATCH_ALL);
    r.open = false;
    r.p = 0;
    rememberValue(`p|t|${CATCH_ALL}|${clausesHash}`, 0);
  }
  for (const [id, meta] of tripB.manifest) {
    if (meta.kind !== "item" || (suppressCatchAll && meta.fieldKey.startsWith(`${CATCH_ALL}.`))) continue;
    itemP.set(meta.fieldKey, answersB.get(id)?.noul ?? 0);
  }

  // ---------- Trip C: value follow-ups for trip A's fields + one evidence/value shot for trip B's fields ----------

  const tripC = questionBatch();
  const resolvedA = pendingA.map((p) => finishEvidence(p, answersB, tripC, "C"));

  const pendingB = [];
  for (const id of freshIds) {
    const b = bundles.get(id);
    for (const item of b.items) {
      const fieldKey = `${id}.${item.id}`;
      if (lockedSet.has(fieldKey) || fieldState(itemP.get(fieldKey)) === "empty") continue;
      pendingB.push(beginField(fieldKey, b, item, tripC, "C"));
    }
  }
  // Narrow each trigger clause to the words that did it ("DM2" out of "k/c/o DM2, HTN"). Options are the
  // clause's own word runs, so the answer is always a span of the note and never generated text.
  const triggerSpan = new Map(); // bundleId -> { index, questionId?, spans? }
  for (const [id, pick] of triggerClause) {
    if (suppressCatchAll && id === CATCH_ALL) continue;
    const index = pick.index ?? pick.keyForIndex.get(answersB.get(pick.questionId)?.choice);
    if (index == null) continue;
    const clause = scrubbedSentences[index].text;
    const words = [...clause.matchAll(/[^\s,;:()"“”]+/g)].slice(0, TRIGGER_WORDS_MAX).map((m) => ({ start: m.index, end: m.index + m[0].replace(/[.!?]+$/, "").length }));
    const criteria = {};
    const spans = new Map();
    for (let a = 0; a < words.length; a++) for (let n = 1; n <= TRIGGER_SPAN_WORDS && a + n <= words.length; n++) {
      const span = { start: words[a].start, end: words[a + n - 1].end };
      if (span.end <= span.start) continue;
      const key = `w${a}_${n}`;
      criteria[key] = clause.slice(span.start, span.end);
      spans.set(key, span);
    }
    if (spans.size < 2) { triggerSpan.set(id, { index }); continue; }
    const questionId = tripC.add({ type: "choice", instructions: `In "${clause}", which words are the mention that shows this: ${bundles.get(id).trigger} Pick the shortest complete mention.`, criteria }, { kind: "triggerSpan" });
    triggerSpan.set(id, { index, questionId, spans });
  }
  const answersC = await send(tripC);

  for (const [id, t] of triggerSpan) {
    const original = originalSentences[t.index];
    const span = t.spans?.get(answersC.get(t.questionId)?.choice);
    // Offsets were measured on the name-scrubbed clause. They only transfer when scrubbing left it untouched.
    const exact = span && scrubbedSentences[t.index].text === original.text;
    const lead = original.text.length - original.text.trimStart().length;
    const r = bundleResults.find((b) => b.id === id);
    r.trigger = exact
      ? { start: original.start + span.start, end: original.start + span.end }
      : { start: original.start + lead, end: original.start + original.text.trimEnd().length };
  }

  const resolvedB = pendingB.map((p) => finishEvidence(p, answersC, null, null));

  // ---------- Assemble the response ----------

  const evidenceByField = new Map();
  for (const p of [...resolvedA, ...resolvedB]) {
    evidenceByField.set(p.fieldKey, { sentenceIndex: p.sentenceIndex, value: finishValue(p, answersB, answersC) });
  }

  const fields = {};
  for (const [fieldKey, p] of itemP) {
    if (lockedSet.has(fieldKey)) continue;
    const meta = bundles.field(fieldKey);
    if (!meta) continue;
    const resolved = evidenceByField.get(fieldKey);
    const sentenceIndex = resolved?.sentenceIndex;
    const unit = unitOf(meta.item.type);
    if (sentenceIndex != null && p >= THRESHOLDS.TICK) rememberValue(`p|i|${fieldKey}|${clauseHashes[sentenceIndex]}`, p);
    if (fieldState(p) === "empty") rememberValue(`rej|${fieldKey}|${clausesHash}`, true);
    fields[fieldKey] = {
      p,
      state: fieldState(p),
      value: resolved ? resolved.value : null,
      ...(unit ? { unit } : {}),
      evidence: sentenceIndex != null ? { start: originalSentences[sentenceIndex].start, end: originalSentences[sentenceIndex].end } : null,
    };
  }

  return {
    bundles: bundleResults,
    fields,
    usage: { tokens, calls },
    ms: Math.round(performance.now() - t0),
    bundlesVersion: bundles.version,
    clausesHash,
  };
}
