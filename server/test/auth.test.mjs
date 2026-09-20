import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { freshTestDb, testApp, client } from "./helpers.mjs";

let pool, app, c;

before(async () => {
  pool = await freshTestDb();
  app = testApp({ pool });
  c = client(app);
  await c.start();
});

after(async () => {
  await c.stop();
  await pool.end();
});

test("signup creates a doctor, sets a session cookie, and /api/me reflects it", async () => {
  const signup = await c.req("POST", "/api/auth/signup", { email: "doc1@example.com", password: "hunter2222", name: "Dr One" });
  assert.equal(signup.status, 201);
  assert.equal(signup.body.email, "doc1@example.com");

  const me = await c.req("GET", "/api/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.name, "Dr One");
});

test("signup rejects a duplicate email, a short password, and a bad email", async () => {
  const c2 = client(app);
  await c2.start();
  try {
    const dup = await c2.req("POST", "/api/auth/signup", { email: "doc1@example.com", password: "hunter2222", name: "Dupe" });
    assert.equal(dup.status, 409);
    const shortPw = await c2.req("POST", "/api/auth/signup", { email: "new@example.com", password: "short", name: "X" });
    assert.equal(shortPw.status, 400);
    const badEmail = await c2.req("POST", "/api/auth/signup", { email: "not-an-email", password: "hunter2222", name: "X" });
    assert.equal(badEmail.status, 400);
  } finally {
    await c2.stop();
  }
});

test("login with the wrong password is rejected; the right password succeeds", async () => {
  const c2 = client(app);
  await c2.start();
  try {
    const wrong = await c2.req("POST", "/api/auth/login", { email: "doc1@example.com", password: "wrongpass" });
    assert.equal(wrong.status, 401);
    const right = await c2.req("POST", "/api/auth/login", { email: "doc1@example.com", password: "hunter2222" });
    assert.equal(right.status, 200);
    const me = await c2.req("GET", "/api/me");
    assert.equal(me.status, 200);
  } finally {
    await c2.stop();
  }
});

test("logout clears the session: /api/me is 401 afterwards", async () => {
  const c2 = client(app);
  await c2.start();
  try {
    await c2.req("POST", "/api/auth/login", { email: "doc1@example.com", password: "hunter2222" });
    assert.equal((await c2.req("GET", "/api/me")).status, 200);
    await c2.req("POST", "/api/auth/logout");
    assert.equal((await c2.req("GET", "/api/me")).status, 401);
  } finally {
    await c2.stop();
  }
});

test("/api/me without a session is 401", async () => {
  const c2 = client(app);
  await c2.start();
  try {
    assert.equal((await c2.req("GET", "/api/me")).status, 401);
  } finally {
    await c2.stop();
  }
});
