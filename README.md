# Hx

[![Star on GitHub](https://img.shields.io/github/stars/doitrous/hx?style=social)](https://github.com/doitrous/hx)

**If Hx is useful to you, please star the repository. It is how other doctors find it.**

The clinical record that fills itself in while you write.

A doctor types or dictates a history, examination or operative note. Hx opens the questions that
note calls for, ticks them off against what was actually written, and shows what is still
undocumented. It never generates text: every answer is a clause or a value copied from the note.

Judgments come from TypeSafe's Jev model (typed yes/no, choice and score answers, no free text).

## Layout

| Path | What it is |
|---|---|
| `vault/` | Obsidian vault. The source of truth for every question set, trigger and connection. |
| `scripts/compile-vault.mjs` | Compiles the vault into `server/bundles.json`. |
| `server/` | Node 24 + Express API. `analyze.mjs` is the pipeline. `eval/` holds the live recall suites. |
| `web/` | Vite + React 19 + Tailwind v4 front end. |
| `docs/CONTRACT.md` | API contract between server and web. |
| `trial/` | The original one-file prototype. |

## Run locally

```bash
export TYPESAFE_API_KEY=...        # never commit this
(cd server && npm ci && npm start) # API on :4820
(cd web && npm ci && npm run dev)  # site on :4830
```

Accounts and patient records need Postgres (`docker compose up -d`). They are on in development and
off in production unless `ACCOUNTS_ENABLED=1`.

## Deploy the public demo

Build the root `Dockerfile`. The container listens on 4820 and needs one variable.

| Variable | Default | Purpose |
|---|---|---|
| `TYPESAFE_API_KEY` | none | Required. |
| `DEMO_IP_DAILY_USD` | `0.006` | Most one address may spend per day. |
| `DEMO_DAILY_USD` | `3` | Most the whole demo may spend per day. |
| `DEMO_MAX_PER_10_MIN` | `600` | Request-rate limit per address. |
| `GA_MEASUREMENT_ID` | none | Google Analytics 4 ID, such as `G-XXXXXXXXXX`. Note text is never sent. |
| `ACCOUNTS_ENABLED` | off in production | Set to `1` with `DATABASE_URL` to enable logins and records. |

## Checks

```bash
(cd server && npm test)               # unit tests
node server/eval/run.mjs              # live trigger recall and precision (needs the key)
node server/eval/catchall.mjs         # live check of the catch-all diagnosis bundle
(cd web && npx tsc -b --noEmit && npm run build)
```

## Privacy

Patient names and MRNs are never sent to the model. The public demo stores nothing.
Bundle status: `draft` is new, `checked` is machine-reviewed, `reviewed` is signed off by a doctor.

## Not a medical device

Hx is a documentation aid. It does not diagnose, advise or decide. The clinician remains
responsible for the note and for the care of the patient.

## Licence

MIT. See `LICENSE`.
