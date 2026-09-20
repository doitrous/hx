import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, THRESHOLDS, clearValueCache } from "../analyze.mjs";
import { loadBundles } from "../bundles.mjs";
import { scriptedJev, keyContaining } from "./helpers.mjs";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "bundles.json");
const bundles = loadBundles(FIXTURE);

beforeEach(() => clearValueCache());

const trigger = (text) => ({ match: (q) => q.type === "noul" && q.instructions === text, respond: () => ({ type: "noul", noul: 0 }) });

test("bundle opens when trigger p >= FIRE, stays closed below it; always-on bundle is open from the start", async () => {
  const jev = scriptedJev([
    { match: (q) => q.instructions.includes("diabetes mellitus"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.instructions.includes("has a cough"), respond: () => ({ type: "noul", noul: 0.1 }) },
  ]);
  const result = await analyze({ mode: "clinical", text: "Known diabetic on metformin.", open: [], locked: [] }, { jev, bundles });

  const byId = Object.fromEntries(result.bundles.map((b) => [b.id, b]));
  assert.equal(byId.general.open, true);
  assert.equal(byId.general.p, 1);
  assert.equal(byId.diabetes.open, true);
  assert.ok(byId.diabetes.p >= THRESHOLDS.FIRE);
  assert.equal(byId.cough.open, false);
  assert.ok(byId.cough.p < THRESHOLDS.FIRE);
  assert.equal(result.bundlesVersion, "test-fixture-1");
});

test("field states follow the p thresholds", async () => {
  const jev = scriptedJev([
    { match: (q) => q.instructions.includes("diabetes mellitus"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.instructions.includes("an HbA1c value"), respond: () => ({ type: "noul", noul: 0.9 }) }, // filled
    { match: (q) => q.instructions.includes("foot problems"), respond: () => ({ type: "noul", noul: 0.5 }) }, // unclear
    { match: (q) => q.instructions.includes("how it is managed"), respond: () => ({ type: "noul", noul: 0.1 }) }, // empty
  ]);
  // Second call: diabetes already open, so its items get the full evidence+value budget.
  const first = await analyze({ mode: "clinical", text: "Known diabetic on metformin.", open: [], locked: [] }, { jev, bundles });
  const opened = first.bundles.filter((b) => b.open).map((b) => b.id);
  const second = await analyze({ mode: "clinical", text: "Known diabetic on metformin.", open: opened, locked: [] }, { jev, bundles });

  assert.equal(second.fields["diabetes.hba1c"].state, "filled");
  assert.equal(second.fields["diabetes.foot"].state, "unclear");
  assert.equal(second.fields["diabetes.mgmt"].state, "empty");
  assert.equal(second.fields["diabetes.mgmt"].value, null);
});

test("evidence and value: text verbatim, presence Present/Absent, number disambiguated among candidates, bp normalised", async () => {
  // Evidence is a clause, so "mgmt" cites only the first clause and the HbA1c clause keeps two numbers to disambiguate.
  const text = "Known diabetic for 10 years on metformin, HbA1c was 9.1 last year and 8.2 now. He denies foot problems. Blood pressure 130 over 85.";
  const jev = scriptedJev([
    { match: (q) => q.type === "noul" && q.instructions.includes("diabetes mellitus"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.type === "noul" && q.instructions.startsWith("Regarding") && q.instructions.includes("an HbA1c value"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.type === "noul" && q.instructions.startsWith("Regarding") && q.instructions.includes("foot problems"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.type === "noul" && q.instructions.startsWith("Regarding") && q.instructions.includes("how it is managed"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.type === "noul" && q.instructions.startsWith("Regarding") && q.instructions.includes("a blood pressure reading"), respond: () => ({ type: "noul", noul: 0.9 }) },
    // Evidence choice: pick the sentence mentioning the relevant content. Matched by the
    // "Which sentence" prefix so it can't accidentally catch the candidate-choice question below
    // (whose instructions happen to repeat the same item phrase, e.g. "HbA1c").
    {
      match: (q) => q.type === "choice" && q.instructions.startsWith("Which sentence") && q.instructions.includes("HbA1c"),
      respond: (q) => ({ type: "choice", choice: keyContaining(q.criteria, "HbA1c"), probabilities: {}, confidence: 0.9 }),
    },
    {
      match: (q) => q.type === "choice" && q.instructions.startsWith("Which sentence") && q.instructions.includes("foot problems"),
      respond: (q) => ({ type: "choice", choice: keyContaining(q.criteria, "foot problems"), probabilities: {}, confidence: 0.9 }),
    },
    {
      match: (q) => q.type === "choice" && q.instructions.startsWith("Which sentence") && q.instructions.includes("how it is managed"),
      respond: (q) => ({ type: "choice", choice: keyContaining(q.criteria, "metformin"), probabilities: {}, confidence: 0.9 }),
    },
    {
      match: (q) => q.type === "choice" && q.instructions.startsWith("Which sentence") && q.instructions.includes("a blood pressure reading"),
      respond: (q) => ({ type: "choice", choice: keyContaining(q.criteria, "130 over 85"), probabilities: {}, confidence: 0.9 }),
    },
    // Presence noul for "foot problems": denied in the note -> Absent.
    { match: (q) => q.type === "noul" && q.instructions.startsWith("In the sentence"), respond: () => ({ type: "noul", noul: 0.05 }) },
    // Candidate choice for HbA1c: the clause has two numbers, 9.1 and 8.2.
    {
      match: (q) => q.type === "choice" && q.instructions.includes("which value is"),
      // A lone candidate (the blood pressure) is confirmed too, so answer c0 when 8.2 is not on offer.
      respond: (q) => ({ type: "choice", choice: keyContaining(q.criteria, "8.2") === "none" ? "c0" : keyContaining(q.criteria, "8.2"), probabilities: {}, confidence: 0.9 }),
    },
  ]);

  const first = await analyze({ mode: "clinical", text, open: [], locked: [] }, { jev, bundles });
  const opened = first.bundles.filter((b) => b.open).map((b) => b.id);
  const result = await analyze({ mode: "clinical", text, open: opened, locked: [] }, { jev, bundles });

  assert.equal(result.fields["diabetes.hba1c"].value, "8.2");
  assert.equal(result.fields["diabetes.hba1c"].unit, "%");
  assert.equal(result.fields["diabetes.foot"].value, "Absent");
  assert.equal(result.fields["diabetes.mgmt"].value, "Known diabetic for 10 years on metformin");
  assert.equal(result.fields["general.bp"].value, "130/85");
  for (const key of ["diabetes.hba1c", "diabetes.foot", "diabetes.mgmt", "general.bp"]) {
    assert.ok(result.fields[key].evidence, `${key} should have an evidence span`);
    assert.equal(text.slice(result.fields[key].evidence.start, result.fields[key].evidence.end).length > 0, true);
  }
});

test("known-evidence reuse: a verbatim sentence still in the text needs no extra Jev call", async () => {
  const text = "Known diabetic for 10 years on metformin, last HbA1c was 8.2.";
  const known = { "diabetes.mgmt": "Known diabetic for 10 years on metformin" };
  const jev = scriptedJev([
    { match: (q) => q.instructions.includes("diabetes mellitus"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.instructions.includes("how it is managed"), respond: () => ({ type: "noul", noul: 0.9 }) },
    // Everything else (hba1c, foot, general items) stays low/empty so no other evidence chase starts.
  ]);
  const result = await analyze({ mode: "clinical", text, open: ["diabetes", "general"], locked: [], known }, { jev, bundles });

  assert.equal(result.fields["diabetes.mgmt"].value, "Known diabetic for 10 years on metformin");
  assert.equal(jev.calls(), 1, "known-cache reuse for a text field should add no extra Jev call beyond the item noul trip");
});

test("a Present/Absent value is judged once: the second call with the same known sentence costs one trip", async () => {
  const text = "Known diabetic. No foot problems.";
  const known = { "diabetes.foot": "No foot problems." };
  const jev = scriptedJev([
    { match: (q) => q.instructions.includes("diabetes mellitus"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.instructions.startsWith("Regarding") && q.instructions.includes("foot problems"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.instructions.startsWith("In the sentence"), respond: () => ({ type: "noul", noul: 0.05 }) },
  ]);
  const args = { mode: "clinical", text, open: ["diabetes", "general"], locked: [], known };
  const first = await analyze(args, { jev, bundles });
  assert.equal(first.fields["diabetes.foot"].value, "Absent");
  const before = jev.calls();
  const second = await analyze(args, { jev, bundles });
  assert.equal(second.fields["diabetes.foot"].value, "Absent");
  assert.equal(jev.calls() - before, 1, "steady state must be a single Jev round trip");
});

test("locked fields are never asked and never appear in the response", async () => {
  const text = "Known diabetic on metformin. He denies foot problems.";
  const jev = scriptedJev([
    { match: (q) => q.instructions.includes("diabetes mellitus"), respond: () => ({ type: "noul", noul: 0.9 }) },
    {
      match: (q) => /foot/i.test(q.instructions),
      respond: () => {
        throw new Error("a locked field must never be asked about");
      },
    },
  ]);
  const result = await analyze({ mode: "clinical", text, open: ["diabetes"], locked: ["diabetes.foot"] }, { jev, bundles });
  assert.equal("diabetes.foot" in result.fields, false);
});

test("no PHI reaches Jev: patient name is scrubbed from state and every question", async () => {
  const text = "Jane Doe presents with a cough for 3 days. Jane denies fever.";
  const jev = scriptedJev([{ match: (q) => q.instructions.includes("has a cough"), respond: () => ({ type: "noul", noul: 0.9 }) }]);
  await analyze({ mode: "clinical", text, open: [], locked: [], patientId: "p1" }, { jev, bundles, patientName: "Jane Doe" });

  assert.ok(jev.callLog.length > 0);
  for (const { state, questions } of jev.callLog) {
    const payload = JSON.stringify({ state, questions }); // state is an object now: concatenating it would hide its contents
    assert.match(payload, /the patient presents with a cough/i, "the scrubbed note must actually be in the inspected payload");
    assert.doesNotMatch(payload, /\bJane\b|\bDoe\b/i);
  }
});

test("mode selects the right bundle kinds: clinical = history+exam, operative = op-*", async () => {
  const jev = scriptedJev([]);
  const result = await analyze({ mode: "clinical", text: "text", open: [], locked: [] }, { jev, bundles });
  const ids = result.bundles.map((b) => b.id).sort();
  assert.deepEqual(ids, ["cough", "diabetes", "general", "named_diagnosis"]);
});

test("usage and ms are reported", async () => {
  const jev = scriptedJev([]);
  const result = await analyze({ mode: "clinical", text: "text", open: [], locked: [] }, { jev, bundles });
  assert.equal(typeof result.usage.tokens, "number");
  assert.equal(typeof result.usage.calls, "number");
  assert.equal(typeof result.ms, "number");
  assert.ok(result.ms >= 0);
});

test("settled work is not re-asked: adding text mid-sentence asks only the unfilled items", async () => {
  const asked = [];
  const jev = scriptedJev([
    { match: (q) => { asked.push(q.instructions); return false; }, respond: () => ({}) },
    { match: (q) => q.instructions.includes("diabetes mellitus"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.instructions.startsWith("Regarding") && q.instructions.includes("how it is managed"), respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.instructions.startsWith("Which sentence") && q.instructions.includes("how it is managed"), respond: (q) => ({ type: "choice", choice: keyContaining(q.criteria, "metformin"), probabilities: {}, confidence: 0.9 }) },
  ]);
  const text = "Known diabetic on metformin.";
  const first = await analyze({ mode: "clinical", text, open: [], locked: [] }, { jev, bundles });
  const open = first.bundles.filter((b) => b.open).map((b) => b.id);
  const second = await analyze({ mode: "clinical", text, open, locked: [], prevHash: first.clausesHash }, { jev, bundles });
  const known = { "diabetes.mgmt": text.slice(second.fields["diabetes.mgmt"].evidence.start, second.fields["diabetes.mgmt"].evidence.end) };

  asked.length = 0;
  const grown = text + " He also reports,";
  const third = await analyze({ mode: "clinical", text: grown, open, locked: [], known, prevHash: second.clausesHash }, { jev, bundles });

  assert.ok(!asked.some((q) => q.includes("diabetes mellitus")), "an open bundle's trigger is not re-judged while nothing was deleted");
  assert.ok(!asked.some((q) => q.includes("has a cough")), "closed triggers wait for the end of the sentence");
  assert.ok(!asked.some((q) => q.startsWith("Regarding") && q.includes("how it is managed")), "a field filled from a clause still in the note is not re-asked");
  assert.ok(asked.some((q) => q.includes("an HbA1c value")), "unfilled fields of open bundles are still asked");
  assert.equal(third.fields["diabetes.mgmt"].state, "filled");
  assert.equal(third.bundles.find((b) => b.id === "diabetes").open, true);

  asked.length = 0;
  await analyze({ mode: "clinical", text: "He also reports a cough.", open, locked: [], known, prevHash: third.clausesHash }, { jev, bundles });
  assert.ok(asked.some((q) => q.includes("diabetes mellitus")), "deleting text re-judges open bundles");
  assert.ok(asked.some((q) => q.includes("how it is managed")), "and re-asks fields whose evidence clause is gone");
});

test("the catch-all diagnosis bundle stays shut when every named disease already has its own bundle", async () => {
  const base = [
    { match: (q) => q.instructions === "The patient themself has diabetes mellitus", respond: () => ({ type: "noul", noul: 0.9 }) },
    { match: (q) => q.instructions === "The note names a specific disease the patient themself has", respond: () => ({ type: "noul", noul: 0.9 }) },
  ];
  const leftover = (p) => ({ match: (q) => q.instructions.includes("other than anything belonging under these headings: Diabetes mellitus"), respond: () => ({ type: "noul", noul: p }) });
  const args = { mode: "clinical", text: "Known diabetic.", open: [], locked: [] };

  const shut = await analyze(args, { jev: scriptedJev([leftover(0.1), ...base]), bundles });
  assert.equal(shut.bundles.find((b) => b.id === "named_diagnosis").open, false);
  assert.equal(shut.bundles.find((b) => b.id === "diabetes").open, true);
  assert.ok(!Object.keys(shut.fields).some((k) => k.startsWith("named_diagnosis.")));

  clearValueCache();
  const open = await analyze(args, { jev: scriptedJev([leftover(0.9), ...base]), bundles });
  assert.equal(open.bundles.find((b) => b.id === "named_diagnosis").open, true);
});
