# server

Express + Postgres + the Jev pipeline. Plain JavaScript (ES modules), no TypeScript, no build
step. Runtime dependencies: `express` and `pg` only.

## Run locally

```sh
# from the repo root
docker compose up -d          # postgres:17-alpine on localhost:5433
cd server
npm install
npm run migrate               # optional: server.mjs also runs migrations at startup
TYPESAFE_API_KEY=... npm start
```

The server listens on `PORT` (default `4820`). Without `TYPESAFE_API_KEY` set it still starts;
`/api/analyze` and `/api/demo/analyze` return `503` until the key is set.

Seed demo data (one doctor, 14 synthetic patients, ~40 encounters over 10 weeks):

```sh
npm run seed
```

This prints the demo login (`demo@example.com` / a generated password) once. Re-running it is a
no-op if that doctor already exists.

## Environment variables

There's no `.env.example` in this repo (see note below) — copy this into a local `.env` at the
repo root, or export the same variables another way:

```
DATABASE_URL=postgres://history_checker:dev_password@localhost:5433/history_checker
TYPESAFE_API_KEY=
PORT=4820
NODE_ENV=development
SESSION_DAYS=30
```

`docker-compose.yml` at the repo root already matches these dev credentials. `TYPESAFE_API_KEY`
should already be exported in your shell (`~/.zshenv`) rather than read from a file.

> A `.env.example` file was requested by the spec but could not be created in this environment:
> the sandbox's permission rules block writing or reading any `.env*` path outright, even a
> non-secret template. The block is on the filename, not the content. Create it yourself with the
> block above if you'd like the file on disk.

## Tests

```sh
cd server
npm test          # node --test — needs the docker Postgres on 5433 (docker compose up -d)
```

Tests never touch your dev database: each test file creates and drops its own throwaway Postgres
database (see `test/helpers.mjs`), so `npm test` and `npm run seed` can't collide.

The Jev pipeline tests (`test/analyze.test.mjs`) run against a fake Jev client and a small fixture
bundle set (`test/fixtures/bundles.json`) — no network access, no real bundle ids hard-coded
outside of tests, per the rule that `bundles.json` is compiled and read-only.

One test is a **live smoke test** (`test/live.smoke.test.mjs`) that calls the real TypeSafe API
and spends real credit. It's skipped unless both `TYPESAFE_API_KEY` and `LIVE=1` are set:

```sh
LIVE=1 npm test -- test/live.smoke.test.mjs
```

## Deploying on Coolify

1. Create a **PostgreSQL 17** resource on Coolify. Copy its internal connection string.
2. Create an application resource pointing at this repo, build type **Dockerfile** (the root
   `Dockerfile` builds `web/` if present and serves it statically with an SPA fallback, then runs
   the server; migrations run automatically on boot).
3. Set env vars on the app: `DATABASE_URL` (from step 1, `sslmode=require` if Coolify's Postgres
   needs TLS — `server/db.mjs` detects that and disables certificate verification for it),
   `TYPESAFE_API_KEY`, `PORT=4820`, `NODE_ENV=production`, `SESSION_DAYS`.
4. Deploy. Expose port `4820`.
5. Optionally run `node server/seed.mjs` once (Coolify's terminal, or a one-off command) against
   the production database if you want demo data there too — don't do this against a database that
   already has real patients.

## Layout

One file, one purpose:

| File | Purpose |
|---|---|
| `app.mjs` | Wires middleware + routers; the two `/api/*analyze` endpoints |
| `server.mjs` | Entry point: migrate, then listen |
| `config.mjs` | Env vars in one place |
| `db.mjs` | The `pg` pool |
| `migrate.mjs` | Numbered `.sql` file runner |
| `bundles.mjs` | Loads `bundles.json`, generic lookups (never hard-codes an id) |
| `auth.mjs` | Signup/login/logout/me, scrypt hashing, session cookie middleware |
| `patients.mjs` | Patient CRUD, doctor-scoped |
| `encounters.mjs` | Encounter CRUD, final-is-immutable |
| `analyze.mjs` | The Jev pipeline (see below) |
| `jev.mjs` | TypeSafe API client with retry/backoff |
| `sentences.mjs` | Sentence splitting + name scrubbing |
| `extract.mjs` | Regex candidate extraction (number/bp/duration) |
| `stats.mjs` | `GET /api/stats/dashboard` |
| `ratelimit.mjs` | In-memory limiter for the public demo endpoint |
| `seed.mjs` | Demo data generator |

## Deviations from docs/CONTRACT.md, and why

- **`.env.example` not created.** See above — a permission rule, not a design choice.
- **Trip budget for brand-new bundles.** The spec caps `analyze()` at 3 Jev round trips. For a
  field on a bundle that just opened *this call*, that leaves only one round trip to both find
  the evidence sentence and (for `presence` items, or `number`/`bp`/`duration` items with more
  than one regex candidate) ask which one is right. When that happens the field's `state` still
  reflects the judged probability, but `value` stays `null` for that call — it resolves on the
  *next* `analyze()` call once the client includes the bundle in `open`, which is also the real
  product flow (the doctor keeps typing/dictating and the client re-checks on a debounce). This
  is marked with a `ponytail:` comment in `analyze.mjs`. The mandatory live smoke test exercises
  exactly this by calling `analyze()` twice, as a real client would.
- **`bp` values are normalised, not verbatim.** "130 over 85" and "130/85" both become `"130/85"`.
  The contract's own worked example expects `"130/85"` as the value even when the note says "over",
  so this is a reformatting of the same two numbers already in the note, not an invented value.
- **Presence-noul and candidate-choice question wording** aren't given verbatim in the contract
  (unlike the trigger/item criteria, which are reused word-for-word from `trial/logic.js`). I
  wrote reasonable wording following the same "documented, not judged" style and covered it with
  fake-Jev tests, but it hasn't been tested against the real model the way the trigger/item
  wording has.

## For the frontend team

- `bundles.json` keeps growing as the vault grows (158 bundles as of this writing, up from the 32
  checked in when this backend was started) — nothing on the server side needed to change for
  that, and nothing on the frontend should need to hard-code bundle/field ids either.
- `analyze()` is genuinely stateless and needs the client to carry `open`, `locked`, and `known`
  forward between calls for evidence/value to fully resolve — see the "trip budget" deviation
  above. Expect some fields to come back `filled`/`unclear` with `value: null` and `evidence: null`
  on the call where their bundle *first* opens; re-sending that bundle in `open` on the next call
  fills them in.
- `known[fieldKey]` should be built from the *previous* response: `text.slice(evidence.start,
  evidence.end)` at the field's evidence span. If that exact string is still in the new text
  verbatim, the server reuses it for free.
