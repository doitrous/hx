// Run: node check.mjs   Fails loudly if the bundle file or question builder breaks.
import assert from "node:assert/strict";
import "./bundles.js";
import "./logic.js";
import { mockNoul } from "./server.mjs";

const B = globalThis.BUNDLES, L = globalThis.Logic;
const ids = B.map((b) => b.id);
assert.equal(new Set(ids).size, ids.length, "duplicate bundle id");
for (const b of B) {
  assert.match(b.id, /^[a-z_]+$/, `bad id ${b.id}`);
  assert.ok(["history", "exam"].includes(b.list), `${b.id}: bad list`);
  assert.ok(b.about && b.items.length, `${b.id}: needs about and items`);
  for (const s of b.items) assert.ok(L.parseItem(s).label && L.parseItem(s).phrase, `${b.id}: empty item`);
}
assert.deepEqual(L.parseItem("Site"), { label: "Site", phrase: "site" });
assert.deepEqual(L.parseItem("Age | the patient's age"), { label: "Age", phrase: "the patient's age" });

const t = L.triggerQuestions(B);
assert.equal(Object.keys(t).length, B.filter((b) => b.trigger).length);
const q = L.itemQuestions(B, new Set(["pain"]));
assert.equal(q.i_pain_0.instructions, "Regarding the patient's pain: the note documents the site of the pain.");

const always = L.activeIds(B, {});
assert.ok(always.has("personal") && !always.has("diabetes"), "only always-on bundles with no answers");
assert.ok(L.activeIds(B, { t_diabetes: 0.9 }).has("diabetes"));
assert.deepEqual([0.9, 0.5, 0.1, undefined].map(L.itemState), ["done", "maybe", "missing", "missing"]);

assert.ok(mockNoul("he has vomiting", "The patient has vomiting") > 0.5);
assert.ok(mockNoul("he has a cough", "The patient has vomiting") < 0.5);
console.log(`ok: ${B.length} bundles, ${B.reduce((n, b) => n + b.items.length, 0)} items`);
