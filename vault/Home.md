# Clinical Notes vault

This vault is the source of truth for the app's "bundles": the trigger statements, record-sheet
items and connections that `node scripts/compile-vault.mjs` compiles into `server/bundles.json`.
Everything under `History/`, `Examination/` and `Operative/` is compiled. `Project/`, `Research/`
and `Maps/` are authoring and browsing aids only and are not compiled.

## Editing a bundle

Read `[[Note format]]` before touching a bundle. In short: a bundle is a trigger, 4-14 items and a
`## Related` section. A Related line is a real screening question added to the note as a
Present/Absent field; if it screens positive, the target bundle opens with the reason shown to the
doctor as "opened because …". Never change a note's `id`, `kind`, `trigger`, `status` or file name —
patient records and other links point at them.

## Compiling

Run this from the project root after any edit, until it prints `ok` with no problems:

```
node scripts/compile-vault.mjs
```

This writes `server/bundles.json`. Never hand-edit that file.

## Browsing the map

Each system below has a map-of-content note listing its bundles by History / Examination /
Procedures, with each bundle's outgoing connections nested underneath as "→ target: reason".
`[[All connections]]` is a single sorted table of every connection in the vault. The Obsidian graph
view (colour-grouped by folder) is the same map drawn visually — an authoring tool only, not part of
the product UI.

### History and examination, by system

- [[Abdominal]]
- [[Breast]]
- [[Cardiac]]
- [[Chest]]
- [[Endocrine]]
- [[General]]
- [[General surgery]]
- [[Gynecology]]
- [[Head and neck]]
- [[Hematology]]
- [[Lymphatic]]
- [[Neurology]]
- [[Peripheral nerves]]
- [[Renal]]
- [[Rheumatology]]
- [[Vascular]]

### Operative

- [[Operative core]] — the always-on team, procedure, closure and postoperative plan bundles
- [[Operative events]] — intraoperative events that can fire during any procedure
- [[Endoscopy]]
- [[General and GI]]
- [[Orthopedics]]
- [[Thyroid breast soft tissue]]
- [[Vascular and limb]]

### Everything at once

- [[All connections]]

## Background reading

- [[00 Plan]] — the product plan this vault serves
- [[Display research brief]] — the evidence behind the sheet, connection view and alert-fatigue
  budget this vault's connections were written against
