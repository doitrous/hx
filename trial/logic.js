// Shared by the page and check.mjs. Turns bundles into Jev Noul questions and Jev answers into states.
(() => {
  // Calibration knobs. Tune these against real notes.
  const FIRE = 0.5;   // trigger probability at which a bundle appears
  const TICK = 0.7;   // item probability that counts as documented
  const MAYBE = 0.4;  // between MAYBE and TICK the item shows as "unclear"

  const TRIGGER_CRITERIA = {
    true: "The note says this applies to the patient themself as part of this presentation or their own medical background.",
    false: "It is not mentioned, it is explicitly denied, or it applies only to a relative or someone else.",
  };
  const ITEM_CRITERIA = {
    true: "The note addresses this point. Stating that it is absent, normal, none or unknown counts, and so does giving a value.",
    false: "The note does not address this point at all.",
  };

  const parseItem = (s) => {
    const [label, phrase] = s.split("|").map((x) => x.trim());
    return { label, phrase: phrase || label.toLowerCase() };
  };

  const triggerQuestions = (bundles) =>
    Object.fromEntries(bundles.filter((b) => b.trigger).map((b) =>
      [`t_${b.id}`, { type: "noul", instructions: b.trigger, criteria: TRIGGER_CRITERIA }]));

  const itemQuestions = (bundles, ids) =>
    Object.fromEntries(bundles.filter((b) => ids.has(b.id)).flatMap((b) =>
      b.items.map((s, i) => [`i_${b.id}_${i}`, {
        type: "noul",
        instructions: `Regarding ${b.about}: the note documents ${parseItem(s).phrase}.`,
        criteria: ITEM_CRITERIA,
      }])));

  const activeIds = (bundles, answers) =>
    new Set(bundles.filter((b) => !b.trigger || (answers[`t_${b.id}`] ?? 0) >= FIRE).map((b) => b.id));

  const itemState = (p) => (p == null ? "missing" : p >= TICK ? "done" : p >= MAYBE ? "maybe" : "missing");

  globalThis.Logic = { parseItem, triggerQuestions, itemQuestions, activeIds, itemState };
})();
