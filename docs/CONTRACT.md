# Contract between vault, server and web

Layout: `vault/` (content) · `scripts/compile-vault.mjs` · `server/` (Express, Postgres, Jev) · `web/` (Vite, React 19, TypeScript, Tailwind v4) · `trial/` (old prototype, reference only).

## bundles.json (compiled, read-only)

```ts
type Bundles = { version: string; bundles: Bundle[] };
type Bundle = { id: string; title: string; kind: "history"|"exam"|"op-core"|"op-event"|"op-procedure"; system: string;
  trigger: string | null;            // null = always on
  about: string; status: "draft"|"reviewed"; items: Item[] };
type Item = { id: string; label: string; phrase: string;
  type: "text"|"presence"|"duration"|"bp"|`number ${string}`|"number";
  link?: string; reason?: string };  // link = target bundle id: this item is a connection
```
A field on the record sheet is addressed as `"<bundleId>.<itemId>"` (a **field key**).

## The analysis call (the heart of the product)

`POST /api/analyze` (logged-in) and `POST /api/demo/analyze` (public, rate limited, nothing stored). Stateless.

```ts
type AnalyzeRequest = {
  mode: "clinical" | "operative";          // clinical = history + exam bundles, operative = op-* bundles
  text: string;                             // the note. Server scrubs the patient's stored name before Jev sees it.
  open: string[];                           // bundle ids currently open on the client
  locked: string[];                         // field keys the doctor edited or dismissed: never re-asked
  known?: Record<string, string>;           // field key -> evidence sentence from the last response. If that sentence is still
                                            // in the text the server reuses it instead of asking Jev again.
  prevHash?: string;                        // the previous response's clausesHash. Lets the server skip questions that cannot have
                                            // changed: open bundles' triggers and filled fields while no text was deleted, and
                                            // closed bundles' triggers until the sentence ends. Omit it and everything is asked.
  patientId?: string;                       // product only, used for name scrubbing
};
type AnalyzeResponse = {
  bundles: { id: string; p: number; open: boolean }[];          // every triggered bundle with its probability
  fields: Record<string /*field key*/, Field>;                  // every item of every open bundle
  usage: { tokens: number; calls: number }; ms: number; bundlesVersion: string;
  clausesHash: string;                      // echo back as prevHash on the next request
};
type Field = {
  p: number;                                 // probability the note documents it
  state: "filled" | "unclear" | "empty";     // p >= 0.7, 0.4..0.7, < 0.4 (thresholds in one server config)
  value: string | null;                      // what lands on the sheet, by item type:
                                             //   text -> the evidence sentence, verbatim · presence -> "Present" | "Absent"
                                             //   number -> "8.2" · bp -> "130/85" · duration -> "3 days"
  unit?: string;
  evidence: { start: number; end: number } | null;   // character span in `text` of the sentence it came from
};
```
Jev never generates. `value` is always copied from the note or chosen from a fixed set.

## Records API (product, session cookie)

```
POST /api/auth/signup {email,password,name}   POST /api/auth/login   POST /api/auth/logout   GET /api/me
GET  /api/patients?q=                          POST /api/patients {mrn,name?,sex?,birthYear?}
GET  /api/patients/:id                         PATCH /api/patients/:id
GET  /api/patients/:id/encounters              POST /api/patients/:id/encounters {mode,title?}
GET  /api/encounters/:id                       PUT  /api/encounters/:id {text, sheet}      POST /api/encounters/:id/finalize
GET  /api/bundles                              GET  /api/stats/dashboard
```
```ts
type Sheet = Record<string /*field key*/, { value: string|null; unit?: string; state: Field["state"]|"dismissed";
  source: "jev"|"doctor"; p?: number; evidence?: {start:number;end:number}|null }>;
type Encounter = { id: string; patientId: string; mode: "clinical"|"operative"; title: string; text: string; sheet: Sheet;
  openBundles: string[]; status: "draft"|"final"; bundlesVersion: string; createdAt: string; updatedAt: string; finalizedAt?: string };
type Patient = { id: string; mrn: string; name?: string; sex?: "M"|"F"; birthYear?: number; createdAt: string;
  lastEncounterAt?: string; openDrafts: number; completeness?: number /*0..1 of last encounter*/ };
type DashboardStats = { patients: number; encountersThisWeek: number; openDrafts: number; avgCompleteness: number;
  completenessByWeek: { week: string; value: number }[];
  mostMissed: { fieldKey: string; label: string; bundleTitle: string; missedRate: number; n: number }[];
  bySystem: { system: string; encounters: number }[] };
```
Rules: a doctor sees only their own patients. MRN is unique per doctor. A `final` encounter is immutable. A field with `source: "doctor"` is never overwritten by Jev. Errors are `{ error: string }` with a proper status code.

## Privacy rules (non-negotiable)

1. Patient name and MRN are never sent to Jev. The server replaces each stored name token in the text with "the patient" before the call, and maps evidence spans back to the original text.
2. The Jev key lives only in the server environment (`TYPESAFE_API_KEY`).
3. The public demo stores nothing and caps text length.
