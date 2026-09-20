# Build plan

Status: **approved 2026-09-20, Wave 1 running** · written 2026-09-20 · working title "Clinical Notes" (no Nishany name or logo anywhere)

## What we are building

A doctor's workspace where typing or dictating a note makes the right questions appear, tick themselves off, and fill a structured patient record. Two note types share one engine: **clinical history and examination**, and **operative notes**. Jev only judges text. It never writes any.

## Decisions already made

| Topic | Decision |
|---|---|
| Storage | Postgres. Local Docker Postgres for development, a new Postgres on Coolify for production. |
| Extraction | Jev only. Code finds candidate values, Jev picks the right one. Nothing generated. |
| Operations | General and GI, endoscopy, thyroid and breast and soft tissue, vascular and limb, orthopedics. |
| Clinical content | This vault is the source of truth. A script compiles it into the app. |
| Design | Nishany's "Clinical Chart" system: tokens, type, motion, meters. No wordmark, no mark, no Jost. |
| Privacy | Doctor works by MRN. Patient name lives only in our database and is scrubbed from text before it goes to Jev. |

## Added on approval

- **Two faces.** The landing page is a public demo anyone can try: no login, nothing stored, rate limited. The product behind it is for doctors with logins.
- **The record sheet is the product.** The checklist and the extraction panel are one thing: an interactive patient sheet. Every item is a field with a fixed, obvious place. Jev fills a field with the sentence or value it found in the note. The doctor can edit any field, and a field the doctor edited is never overwritten. Empty fields that the note has triggered are the cue for what to say next.
- **Production database:** plain PostgreSQL 17 on Coolify.

## Architecture

```
vault/  ──compile──▶  bundles.json ──▶  server (Express + Postgres + Jev proxy)  ◀──▶  web (Vite, React, Tailwind v4)
```

- **vault/**: one note per bundle. Frontmatter holds id, kind, system, trigger and about. The body holds items and a Related section of `[[links]]`, each with a reason.
- **Compile script**: validates every note, fails on broken links or duplicate ids, writes `bundles.json` with a version hash.
- **Server**: login, patients, encounters, the Jev pipeline, and the key. Same stack as Nishany's server so the design and patterns carry over.
- **Web**: login, dashboard, patient record, note workspace, operative note workspace.

## How a connection works

A link in the vault is not decoration. `Diabetes → Chronic renal failure (reason: nephropathy)` does two things in the app. It adds a screening item to the diabetes bundle, and it draws the renal bundle as a linked suggestion. If the screening answer is positive, the renal bundle opens on its own. The Obsidian graph and the app's connection indicators are the same map.

## The Jev pipeline, per check

1. Scrub the patient's stored name from the text.
2. One call: all triggers for this note type, plus items of bundles already open.
3. A second call only when a new bundle fires.
4. Extraction: code finds candidates such as numbers with units, durations and drug names. Jev chooses which candidate is the HbA1c, the blood pressure and so on, or none.
5. Evidence: for each newly ticked item, Jev picks the sentence that documents it. This powers the highlight between the note and the checklist.

Measured today from Cairo: about 370 ms per call, about 10,600 tokens per check, about $0.0005 per check.

## Database

`doctors`, `patients` (MRN unique per doctor, name, sex, birth year), `encounters` (kind, note text, status, bundle version), `encounter_bundles`, `encounter_items` (state, probability, evidence span), `encounter_facts` (key, value, unit, evidence span), `audit_log`. Finalised encounters are immutable. Amendments create a new version.

## Screens

1. **Login.** Required, because the app will sit on the public internet with patient data.
2. **Dashboard.** Patient list by MRN, open drafts, completeness per encounter, and the items you most often leave undocumented.
3. **Patient record.** Encounter timeline, problem list built from fired triggers, trends of extracted values such as HbA1c, blood pressure and weight.
4. **Note workspace.** Editor with dictation on the left. On the right, the live extracted record, and the questions to document with their connections. Hovering an item lights up its sentence, and the reverse.
5. **Operative note workspace.** Same engine. Jev detects the procedure and the events, such as bleeding or resection and anastomosis.

The exact content of each screen is decided after the research brief, not before.

## Orchestration: Sonnet subagents

**Wave 0, me.** Note format, compile script, migrate the 32 existing bundles into the vault, API contract.

**Wave 1, parallel.**
1. Content: neurology and rheumatology, history and examination, from the two sheets.
2. Content: hematology, renal, endocrine (DM, thyroid, Cushing, Addison, GH and acromegaly), lymphadenopathy.
3. Content: remaining examination sheets: breast, parotid, nerves, ischemia, varicose veins, general surgery.
4. Content: operative core note and event bundles: bleeding, resection and anastomosis, stoma, drain, mesh, conversion to open, organ injury, specimen, implants, tourniquet, counts.
5. Content: procedures for general, GI and endoscopy.
6. Content: procedures for thyroid, breast, soft tissue, vascular and orthopedics.
7. Research brief: what a clinical documentation dashboard should show, and what causes alert fatigue.
8. Backend: schema, migrations, login, API, Jev pipeline, tests.
9. Frontend foundation: scaffold, design tokens ported from Nishany, core components.

**Wave 2.**
10. Correlation mapper: reads the whole vault, adds the Related links and screening items, runs the compiler.
11. Frontend: note and operative workspaces.
12. Frontend: dashboard and patient record, using the dashboard and data visualisation skills.

**Wave 3, me.** Design critique pass, end to end test with real Jev, threshold tuning on sample notes, and a review list for you.

## What I need from you

- **Clinical review.** Every bundle an agent writes is marked `status: draft` until you approve it. The sheets are the primary source. Operative content follows published operative note standards. You are the final authority, for example on the bowel viability criteria.
- **Coolify.** My access is read-only. At deploy time you create the Postgres and the app, and paste in the connection string and the Jev key.
- **A name**, whenever you have one.

## Not in this build

Arabic, ambient listening to the consultation, generated summaries, billing codes, multi-clinic administration, mobile app.
