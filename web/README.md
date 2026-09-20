# web

Vite + React 19 + TypeScript (strict) + Tailwind v4. This is the frontend
**foundation**: tokens, primitives, shells, routing and the typed API/mock
client. It does not build product screens — two later agents do (see
`vault/Project/00 Plan.md`, wave 2, items 11 and 12).

## Run

```sh
npm install
npm run dev          # real backend, proxies /api to http://localhost:4820
VITE_MOCK=1 npm run dev   # in-memory fixtures, no backend needed
```

Dev server is on **port 4830**. `npm run build` and `npm run typecheck` must
pass before every commit.

## Where things are

```
src/index.css                  design tokens (@theme), light/dark themes, motion utilities
src/lib/constants.ts           APP_NAME — the ONE place the product's name is spelled out
src/lib/systems.ts             the categorical system palette (spine colour only)
src/lib/types.ts               every type in docs/CONTRACT.md, verbatim
src/lib/api.ts                 typed client, real fetch, throws ApiError
src/lib/mock.ts                same client shape, in-memory fixtures (VITE_MOCK=1)
src/lib/client.ts              picks api.ts or mock.ts based on VITE_MOCK
src/lib/session.tsx            SessionProvider / useSession / RequireSession (GET /api/me guard)
src/lib/theme.ts               light/dark override, persisted in localStorage
src/components/ui/             primitives — see inventory below
src/components/shell/          AppShell, AuthLayout, PatientBanner, Placeholder
src/pages/                     one file per route; all but Login/Signup/Landing/Styleguide are placeholders
```

## Design system: "The Clinical Chart"

Ported from the owner's other product's design system of the same name
(`DoitrousTasks/sites/synapse`). Same tokens, type rules, radii, shadows,
motion rules and the 70% neutral / 25% crimson / 5% blue balance. **Not**
ported: the brand identity (Nishany/Synapse/Connect Cortex naming, the
split-hemisphere mark, Jost, the Wordmark component, the warm and OLED
themes, RTL mirroring, i18n) — none of it applies to this product, and the
owner's hard constraint is design system only, no brand. Fonts are **Source
Serif 4** (page titles), **Geist** (UI), **Geist Mono with tabular figures**
(data) instead of the source's Figtree/Jost, per this project's explicit
brief. Only light and dark themes exist (no warm/OLED) — dark activates from
`prefers-color-scheme` or a `data-theme="dark"`/`"light"` override on
`<html>`, stamped before first paint by the inline script in `index.html`.

### Token inventory (also rendered live at `/styleguide`)

- **Color**: paper/surface/surface-2/inset, ink/ink-2/ink-3, line/line-2,
  grid/grid-major, primary (crimson) + hover/strong/tint/line, accent (blue) +
  strong/tint/line, success/warning/danger + tints, a 6-step heatmap scale.
- **Categorical system palette** (`src/lib/systems.ts`): 19 medium-chroma
  colours, one per clinical system, evenly spaced around the hue wheel and
  kept out of the crimson/danger band. Spine only (`SystemChip`'s 3px inset
  box-shadow) — **never a fill**, and the system name is always printed
  alongside it. Unknown systems fall back to neutral grey.
- **Type**: serif page titles, sans 13.5px bold panel titles, mono tabular
  data.
- **Radius**: 6/8/10/12/16px. **Shadows**: panel/raised/pop/control/action
  (action is crimson-tinted, not black). **Motion**: `--dur-*` tokens,
  `--ease-out-quint`, `animate-screen-in` / `animate-fade` / `animate-pop` /
  `animate-slide-x`, `nav-selected`, `chevron-turn`, `.cn-tab-indicator`,
  `.cn-collapse`, `.cn-meter-fill`. Screen/list entrances animate **transform
  only, never opacity** (see the comment above `animate-screen-in` in
  `index.css` for why). Everything collapses under
  `prefers-reduced-motion: reduce`.

### Component inventory (`src/components/ui/`)

Button + ButtonLink (primary/tinted/ghost/danger, sm/md/lg, loading), IconButton,
Field/Input/Textarea/Select (label, hint, error), Panel + PanelHeader, Chip +
SystemChip, Badge + StatusDot (state is dot + word, never colour alone),
Meter + RangeScale (calibrated-instrument fill on mount), Tabs (single
sliding indicator measured from the active tab), Collapse (measured height),
Dialog (focus trap, Escape, scroll lock), Popover + Tooltip, Toast
(`ToastProvider` + `useToast()`), Skeleton/SkeletonText/SkeletonRow,
EmptyState, Kbd, DataTable (dense, sortable, sticky header, tabular figures,
row hover without lift), PageHeader.

Shell (`src/components/shell/`): `AppShell` (sidebar nav with `nav-selected`,
topbar with a persistent `PatientBanner` slot, theme toggle, user menu,
mobile drawer below `lg`), `AuthLayout` (the clinical-intake-sheet auth
composition, no branding), `PatientBanner` (render once per patient-scoped
screen — MRN/age/sex stay visible no matter how far the page scrolls; wrong-
patient errors are a safety issue), `Placeholder` (used by every unbuilt
page).

### Deliberately not ported from DESIGN.md

- **Brand identity** — no wordmark, mark, logo files, or `public/brand`. The
  product's name is undecided: `APP_NAME` in `src/lib/constants.ts` is the
  only place it's spelled out; the header/auth lockup is plain serif text.
- **Warm and OLED themes** — the brief asked for light + dark only.
- **RTL mirroring / i18n** — `vault/Project/00 Plan.md` explicitly excludes
  Arabic from this build ("Not in this build: Arabic…"). Logical Tailwind
  utilities (`ps-`/`pe-`/`start-`/`end-`) are still used where natural, so
  adding RTL later is a CSS-only change, but no mirrored keyframes or
  direction-aware logic were built for a requirement that doesn't exist yet.
- **⌘K command palette, focus mode, study-room/assistant docks** — product-
  specific to the source app, not part of a clinical-notes tool.
- **Flag colours, study-rhythm heatmap schemes** — features of the source
  product's spaced-repetition system; the one heatmap ramp (`--color-scale-*`)
  that *is* relevant (dashboard intensity) was kept.

## Rules for the screen-building agents

**Allowed**: import anything under `src/lib/` and `src/components/`; add new
pages under `src/pages/` and wire them into `src/App.tsx`; add new
components under `src/components/` **only** if no existing primitive covers
the need — check `/styleguide` first. Use `client` (`src/lib/client.ts`),
never `fetch` or `api`/`mock` directly, so `VITE_MOCK` keeps working. Render
`<PatientBanner mrn sex age />` on every patient- or encounter-scoped screen.

**Forbidden**: any brand string (`Nishany`, `Synapse`, `Connect Cortex`,
`Cortex`, `Jost`) or new brand/logo assets — grep before committing. New
colours outside the tokens in `index.css` / `src/lib/systems.ts`. Opacity-based
entrance animations for page/list content (transform only — see Motion
above). Colour as the sole carrier of state (always pair with a dot, word or
icon). A new component library, CSS-in-JS, or state library — this app is
plain Tailwind + React state/context by design. Editing `server/` or
`vault/` — those belong to other agents.

## Verification

```sh
npm run typecheck && npm run build
VITE_MOCK=1 npm run dev &   # then curl :4830/, /styleguide, /app
```
Grep `dist/` for forbidden brand strings before shipping any change here.
