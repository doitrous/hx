import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { freshTestDb, testApp, signedUpClient } from "./helpers.mjs";

let pool, app, doc, patientId;

before(async () => {
  pool = await freshTestDb();
  app = testApp({ pool });
  doc = await signedUpClient(app, "doc@example.com");
  const patient = await doc.req("POST", "/api/patients", { mrn: "DEMO-0001" });
  patientId = patient.body.id;
});

after(async () => {
  await doc.stop();
  await pool.end();
});

test("create a draft encounter, list it under the patient, and read it back", async () => {
  const created = await doc.req("POST", `/api/patients/${patientId}/encounters`, { mode: "clinical", title: "Visit 1" });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "draft");
  assert.equal(created.body.mode, "clinical");

  const list = await doc.req("GET", `/api/patients/${patientId}/encounters`);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);

  const got = await doc.req("GET", `/api/encounters/${created.body.id}`);
  assert.equal(got.status, 200);
  assert.equal(got.body.id, created.body.id);
});

test("PUT saves text and sheet, and rewrites encounter_fields", async () => {
  const created = await doc.req("POST", `/api/patients/${patientId}/encounters`, { mode: "clinical" });
  const sheet = {
    "diabetes.hba1c": { value: "8.2", unit: "%", state: "filled", source: "jev", p: 0.9, evidence: { start: 0, end: 10 } },
    "diabetes.foot": { value: "Absent", state: "filled", source: "doctor" },
  };
  const put = await doc.req("PUT", `/api/encounters/${created.body.id}`, { text: "Known diabetic.", sheet });
  assert.equal(put.status, 200);
  assert.equal(put.body.text, "Known diabetic.");
  assert.deepEqual(put.body.sheet, sheet);
  assert.deepEqual(put.body.openBundles.sort(), ["diabetes"]);

  const { rows } = await pool.query("SELECT field_key, source FROM encounter_fields WHERE encounter_id = $1 ORDER BY field_key", [created.body.id]);
  assert.deepEqual(
    rows.map((r) => r.field_key),
    ["diabetes.foot", "diabetes.hba1c"]
  );
  assert.equal(rows.find((r) => r.field_key === "diabetes.foot").source, "doctor");
});

test("PUT rejects a malformed sheet", async () => {
  const created = await doc.req("POST", `/api/patients/${patientId}/encounters`, { mode: "clinical" });
  const bad = await doc.req("PUT", `/api/encounters/${created.body.id}`, { text: "x", sheet: { "a.b": { value: "x", state: "bogus", source: "jev" } } });
  assert.equal(bad.status, 400);
});

test("finalize makes an encounter immutable: further PUTs are 409", async () => {
  const created = await doc.req("POST", `/api/patients/${patientId}/encounters`, { mode: "clinical" });
  const finalized = await doc.req("POST", `/api/encounters/${created.body.id}/finalize`);
  assert.equal(finalized.status, 200);
  assert.equal(finalized.body.status, "final");
  assert.ok(finalized.body.finalizedAt);

  const put = await doc.req("PUT", `/api/encounters/${created.body.id}`, { text: "changed", sheet: {} });
  assert.equal(put.status, 409);

  const finalizeAgain = await doc.req("POST", `/api/encounters/${created.body.id}/finalize`);
  assert.equal(finalizeAgain.status, 409);
});

test("another doctor's encounter is 404, not 403", async () => {
  const otherDoc = await signedUpClient(app, "other@example.com");
  try {
    const created = await doc.req("POST", `/api/patients/${patientId}/encounters`, { mode: "clinical" });
    const asOther = await otherDoc.req("GET", `/api/encounters/${created.body.id}`);
    assert.equal(asOther.status, 404);
  } finally {
    await otherDoc.stop();
  }
});
