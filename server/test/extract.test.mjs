import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCandidates, unitOf } from "../extract.mjs";

test("number: single candidate", () => {
  assert.deepEqual(extractCandidates("number %", "Last HbA1c was 8.2."), ["8.2"]);
});

test("number: multiple candidates", () => {
  assert.deepEqual(extractCandidates("number %", "Known diabetic for 10 years, last HbA1c was 8.2."), ["10", "8.2"]);
});

test("number: no candidates", () => {
  assert.deepEqual(extractCandidates("number %", "No numeric value here."), []);
});

test("bp: slash form", () => {
  assert.deepEqual(extractCandidates("bp", "Blood pressure 130/85."), ["130/85"]);
});

test("bp: 'over' form normalises to slash form", () => {
  assert.deepEqual(extractCandidates("bp", "Blood pressure 130 over 85."), ["130/85"]);
});

test("duration: digit and word forms, verbatim substrings", () => {
  assert.deepEqual(extractCandidates("duration", "Pain for 3 days, worse over the last two weeks."), ["3 days", "two weeks"]);
});

test("unitOf reads the suffix after 'number'", () => {
  assert.equal(unitOf("number %"), "%");
  assert.equal(unitOf("number bpm"), "bpm");
  assert.equal(unitOf("number"), undefined);
  assert.equal(unitOf("bp"), undefined);
  assert.equal(unitOf("text"), undefined);
});
