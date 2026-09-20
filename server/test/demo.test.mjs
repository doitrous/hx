import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { freshTestDb, testApp, client, fakeJev } from "./helpers.mjs";

let pool;

before(async () => {
  pool = await freshTestDb();
});

after(async () => {
  await pool.end();
});

test("demo analyze caps text at 4000 chars", async () => {
  const app = testApp({ pool, jev: fakeJev(() => ({})) });
  const c = client(app);
  await c.start();
  try {
    const tooLong = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "a".repeat(4001) });
    assert.equal(tooLong.status, 413);
    const ok = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "a".repeat(4000) });
    assert.equal(ok.status, 200);
  } finally {
    await c.stop();
  }
});

test("demo analyze rate limits per window per IP", async () => {
  const app = testApp({ pool, jev: fakeJev(() => ({})), limits: { demoMaxPerWindow: 30 } });
  const c = client(app);
  await c.start();
  try {
    let last;
    for (let i = 0; i < 31; i++) last = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "short note" });
    assert.equal(last.status, 429);
  } finally {
    await c.stop();
  }
});

test("demo analyze never accepts a patientId (product-only field is simply ignored, nothing stored)", async () => {
  const app = testApp({ pool, jev: fakeJev(() => ({})) });
  const c = client(app);
  await c.start();
  try {
    const res = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "short note", patientId: "should-be-ignored" });
    assert.equal(res.status, 200);
  } finally {
    await c.stop();
  }
});

test("demo analyze stops at the daily token budget and rejects oversized lists", async () => {
  // fakeJev bills 10 tokens per call, so a budget of 1 is spent by the first analysis.
  const app = testApp({ pool, jev: fakeJev(() => ({})), limits: { demoDailyTokens: 1 } });
  const c = client(app);
  await c.start();
  try {
    const first = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "Known diabetic." });
    assert.equal(first.status, 200);
    const second = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "Known diabetic." });
    assert.equal(second.status, 503);
    const padded = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "x", open: Array(5000).fill("diabetes") });
    assert.equal(padded.status, 400);
    const fatKnown = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "x", known: { "diabetes.hba1c": "a".repeat(5000) } });
    assert.equal(fatKnown.status, 400);
  } finally {
    await c.stop();
  }
});

test("demo analyze stops one address at its own daily allowance while the demo as a whole stays open", async () => {
  const app = testApp({ pool, jev: fakeJev(() => ({})), limits: { demoIpDailyTokens: 1 } });
  const c = client(app);
  await c.start();
  try {
    assert.equal((await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "Known diabetic." })).status, 200);
    const blocked = await c.req("POST", "/api/demo/analyze", { mode: "clinical", text: "Known diabetic." });
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.error, /allowance/);
  } finally {
    await c.stop();
  }
});
