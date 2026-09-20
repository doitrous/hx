# Note format

Every note under `History/`, `Examination/` and `Operative/` is one **bundle**: a trigger, the items that must be documented once it fires, and its connections. `node scripts/compile-vault.mjs` validates the vault and writes `server/bundles.json`. If it prints problems, fix them. Never hand-edit `bundles.json`.

## Template

```markdown
---
id: diabetes
title: Diabetes mellitus
kind: history
system: Endocrine
trigger: The patient themself has diabetes mellitus
about: the patient's diabetes
status: draft
source: History Sheet in points, p4
---
## Items
- Latest HbA1c :: an HbA1c value, or that none is available :: number %
- Foot problems :: foot problems or foot care, or their absence :: presence

## Related
- [[Chronic renal failure]] :: Nephropathy screen :: frothy urine, leg swelling or known kidney disease, or their absence :: Diabetes is a leading cause of chronic kidney disease
```

## Frontmatter (flat `key: value` only, no nesting, no lists)

| Key | Rule |
|---|---|
| `id` | Unique, `a-z0-9_`, starts with a letter. History: plain. Examination: `x_` prefix. Operative: `op_` prefix. Never change an id once used: patient records point at it. |
| `title` | Display name. Defaults to the file name. |
| `kind` | `history`, `exam`, `op-core`, `op-event` or `op-procedure`. |
| `system` | Folder-level grouping, e.g. `Neurology`, `Renal`, `Orthopedics`. |
| `trigger` | A **statement about the patient or the operation** that Jev judges true or false. `always` for bundles that are always on. |
| `about` | Noun phrase dropped into every question: "Regarding **{about}**: the note documents **{phrase}**." |
| `status` | `draft` when first written. `checked` after Claude's clinical and wording review (2026-09-20: duplicates removed, wording rules applied, live evals passing). `reviewed` only when Dr. Omar signs it off. Agents always write `draft`. |
| `source` | Where the content came from: sheet and page, or a named guideline. |

## Items: `- Label :: phrase :: type`

- **Label**: 1 to 4 words, shown on the record sheet as the field name. Unique within the note.
- **phrase**: completes "the note documents ___". Optional, defaults to the label in lower case.
- **type**: how the field is filled on the record sheet. Optional, defaults to `text`.

| Type | Field shows | Use for |
|---|---|---|
| `text` | The sentence from the note that documents it | Most items |
| `presence` | Present / Absent | Symptoms and signs where a negative is a valid answer |
| `number <unit>` | A number, e.g. `number %`, `number bpm`, `number mL` | Lab values, vitals, blood loss |
| `bp` | Systolic / diastolic | Blood pressure |
| `duration` | A time span | Durations |

## Related: `- [[Note name]] :: Label :: phrase :: reason`

A connection is a real screening question. It is added to **this** bundle as a `presence` item, and the app draws a link to the target bundle with the reason shown. If the screen is positive in the note, the target bundle's own trigger fires and it opens. The link must use the exact file name of an existing note.

## Wording rules learned from testing Jev

1. **Triggers must survive negation and relatives.** Write "The patient themself has diabetes mellitus", not "diabetes". The app already tells Jev that denied findings and family members do not count.
2. **Never put "including that there are none" or "including that the patient does not…" in a phrase.** It made Jev score a clearly documented smoker as undocumented. The app already tells Jev that a stated negative counts as documented.
3. "or its absence" at the end of a `presence` phrase is fine and tested.
4. **Ask whether it is documented, never whether it is normal.** No value judgments, no diagnosis, no advice. "An HbA1c value is stated", never "HbA1c is high".
5. One judgment per item. Split "onset, course, duration" into three items.
6. **Alert fatigue kills this product.** Aim for 4 to 10 items per bundle, 14 at the very most. Prefer a narrow trigger with few items over a broad one with many. If a sheet section is long, split it into a parent bundle of screening `presence` items and child bundles that open on a positive.
7. Triggers should be as narrow as the content. "The patient has a tremor or other involuntary movement" is good. "The patient has a neurological problem" is too broad for a detail bundle but right for a system review bundle.

## Folders

```
History/<System>/…        Examination/<System>/…
Operative/Core/…          Operative/Events/…          Operative/Procedures/<Specialty>/…
Research/…                Project/…   (not compiled)
```
