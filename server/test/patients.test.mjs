import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { freshTestDb, testApp, signedUpClient } from "./helpers.mjs";

let pool, app, docA, docB;

before(async () => {
  pool = await freshTestDb();
  app = testApp({ pool });
  docA = await signedUpClient(app, "docA@example.com");
  docB = await signedUpClient(app, "docB@example.com");
});

after(async () => {
  await docA.stop();
  await docB.stop();
  await pool.end();
});

test("create + list + get a patient", async () => {
  const created = await docA.req("POST", "/api/patients", { mrn: "DEMO-0001", name: "Test Patient", sex: "F", birthYear: 1990 });
  assert.equal(created.status, 201);
  assert.equal(created.body.mrn, "DEMO-0001");

  const list = await docA.req("GET", "/api/patients");
  assert.equal(list.status, 200);
  assert.ok(list.body.some((p) => p.mrn === "DEMO-0001"));

  const got = await docA.req("GET", `/api/patients/${created.body.id}`);
  assert.equal(got.status, 200);
  assert.equal(got.body.name, "Test Patient");
});

test("MRN is unique per doctor: a duplicate for the same doctor is 409, the same MRN for a different doctor is fine", async () => {
  const first = await docA.req("POST", "/api/patients", { mrn: "DEMO-0002" });
  assert.equal(first.status, 201);
  const dup = await docA.req("POST", "/api/patients", { mrn: "DEMO-0002" });
  assert.equal(dup.status, 409);
  const otherDoctorSameMrn = await docB.req("POST", "/api/patients", { mrn: "DEMO-0002" });
  assert.equal(otherDoctorSameMrn.status, 201);
});

test("doctor A cannot read doctor B's patient", async () => {
  const created = await docB.req("POST", "/api/patients", { mrn: "DEMO-0003" });
  assert.equal(created.status, 201);
  const asA = await docA.req("GET", `/api/patients/${created.body.id}`);
  assert.equal(asA.status, 404);
});

test("creating a patient requires an mrn", async () => {
  const res = await docA.req("POST", "/api/patients", {});
  assert.equal(res.status, 400);
});
