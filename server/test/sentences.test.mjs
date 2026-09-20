import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSentences, splitClauses, scrubName } from "../sentences.mjs";

test("splits on . ! ? and newlines", () => {
  const text = "First sentence. Second one! Third?\nFourth here.";
  const sentences = splitSentences(text).map((s) => s.text);
  assert.deepEqual(sentences, ["First sentence.", "Second one!", "Third?", "Fourth here."]);
});

test("keeps decimals intact", () => {
  const text = "HbA1c was 8.2. Temperature 37.2 was recorded.";
  const sentences = splitSentences(text).map((s) => s.text);
  assert.deepEqual(sentences, ["HbA1c was 8.2.", "Temperature 37.2 was recorded."]);
});

test("keeps abbreviations intact", () => {
  const text = "He has risk factors, e.g. smoking and obesity. He denies chest pain.";
  const sentences = splitSentences(text).map((s) => s.text);
  assert.deepEqual(sentences, ["He has risk factors, e.g. smoking and obesity.", "He denies chest pain."]);
});

test("ignores blank lines and stray whitespace", () => {
  const text = "  First.  \n\n  Second.  ";
  const sentences = splitSentences(text).map((s) => s.text);
  assert.deepEqual(sentences, ["First.", "Second."]);
});

test("spans point back into the original text", () => {
  const text = "Alpha bravo. Charlie delta.";
  const sentences = splitSentences(text);
  for (const s of sentences) assert.equal(text.slice(s.start, s.end), s.text);
});

test("empty text yields no sentences", () => {
  assert.deepEqual(splitSentences(""), []);
  assert.deepEqual(splitSentences("   \n  "), []);
});

test("scrubName replaces whole-word, case-insensitive name tokens", () => {
  const out = scrubName("Jane Doe presents with cough. Jane denies fever, unlike Janet.", "Jane Doe");
  assert.equal(out, "the patient the patient presents with cough. the patient denies fever, unlike Janet.");
});

test("scrubName skips tokens shorter than 3 characters", () => {
  const out = scrubName("A J Lee was seen.", "A J Lee");
  assert.equal(out, "A J the patient was seen.");
});

test("scrubName is a no-op with no patient name", () => {
  assert.equal(scrubName("Jane Doe was seen.", undefined), "Jane Doe was seen.");
});

test("splitClauses cuts a dictated sentence into citeable facts and keeps spans into the original text", () => {
  const text = "Burning in character, radiating to the back; increased by meals. WBC 11,000. However, no fever.";
  const clauses = splitClauses(text);
  assert.deepEqual(clauses.map((c) => c.text), ["Burning in character", "radiating to the back", "increased by meals.", "WBC 11,000.", "However, no fever."]);
  for (const c of clauses) assert.equal(text.slice(c.start, c.end), c.text);
});
