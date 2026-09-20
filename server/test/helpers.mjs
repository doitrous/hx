// Shared test setup: a throwaway database (separate from dev), migrated fresh, plus a fake
// Jev client and helpers for driving the app with a session cookie.
import pg from "pg";
import { createPool } from "../db.mjs";
import { migrate } from "../migrate.mjs";
import { loadBundles } from "../bundles.mjs";
import { createApp } from "../app.mjs";

const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL || "postgres://history_checker:dev_password@localhost:5433/postgres";

// `node --test` runs each test *file* in its own process, in parallel by default. A single
// shared database name would race (one file's DROP colliding with another's CREATE), so every
// call gets its own throwaway database, cleaned up when the returned pool is ended.
export async function freshTestDb() {
  const dbName = `history_checker_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  const admin = new pg.Pool({ connectionString: ADMIN_URL });
  await admin.query(`CREATE DATABASE ${dbName}`);
  const pool = createPool(ADMIN_URL.replace(/\/[^/]*$/, `/${dbName}`));
  await migrate(pool);
  const originalEnd = pool.end.bind(pool);
  pool.end = async () => {
    await originalEnd();
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [dbName]);
    await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await admin.end();
  };
  return pool;
}

// A fake Jev client: `script` is a function (state, questions) -> answers, so each test controls
// exactly what the model "says" without any network access.
export function fakeJev(script) {
  let calls = 0;
  return {
    calls: () => calls,
    ask: async ({ state, questions }) => {
      calls++;
      return { answers: script(state, questions), usage: { input_tokens: 10, output_tokens: 5 } };
    },
  };
}

// A fake Jev client driven by declarative rules: each rule is { match(question, state), respond(question) }.
// Unmatched questions get a neutral default so tests only need to spell out what they care about.
export function scriptedJev(rules) {
  let calls = 0;
  const callLog = [];
  return {
    calls: () => calls,
    callLog,
    ask: async ({ state, questions }) => {
      calls++;
      callLog.push({ state, questions });
      const answers = {};
      for (const [id, q] of Object.entries(questions)) {
        const rule = rules.find((r) => r.match(q, state));
        if (rule) {
          answers[id] = rule.respond(q);
          continue;
        }
        answers[id] =
          q.type === "noul" ? { type: "noul", noul: 0 } : q.type === "choice" ? { type: "choice", choice: "none", probabilities: {}, confidence: 0 } : { type: "score", score: 0 };
      }
      return { answers, usage: { input_tokens: Object.keys(questions).length * 20, output_tokens: Object.keys(questions).length * 5 } };
    },
  };
}

// Starts a client, signs up a fresh doctor, and returns the (now authenticated) client.
export async function signedUpClient(app, email) {
  const c = client(app);
  await c.start();
  const res = await c.req("POST", "/api/auth/signup", { email, password: "hunter2222", name: "Dr Test" });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return c;
}

// Finds the criteria key whose text contains `needle`, for building choice-question responses
// without needing to know the auto-generated key naming (s0/s1/c0/c1/...).
export const keyContaining = (criteria, needle) => Object.entries(criteria).find(([, v]) => v.includes(needle))?.[0] || "none";

export function testApp({ pool, jev, bundlesPath, limits }) {
  const bundles = loadBundles(bundlesPath);
  return createApp({ pool, bundles, jev: jev || fakeJev(() => ({})), limits });
}

// Minimal fetch-based client that keeps the session cookie between calls, so auth flow tests
// read like the real HTTP conversation.
export function client(app, { base = "http://test" } = {}) {
  let server;
  let url;
  let cookie;
  return {
    async start() {
      server = app.listen(0);
      await new Promise((r) => server.once("listening", r));
      url = `http://127.0.0.1:${server.address().port}`;
    },
    async stop() {
      await new Promise((r) => server.close(r));
    },
    async req(method, path, body) {
      const res = await fetch(url + path, {
        method,
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      const text = await res.text();
      const json = text ? JSON.parse(text) : undefined;
      return { status: res.status, body: json };
    },
  };
}
