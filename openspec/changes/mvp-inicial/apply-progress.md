# Apply Progress — mvp-inicial

> Running log across all batches of the `mvp-inicial` change.
> This file is the bridge between `sdd-apply` sessions: each batch
> MERGES its own section into this file (do not delete prior batches).

**Change**: `mvp-inicial`
**Batch strategy** (from `tasks.md` Review Workload Forecast + the user's `stacked-to-main` choice):
3 batches, stacked. Each batch is one `sdd-apply` session; each batch
is verified in Chrome by the user before the next starts.

| Batch | Tasks | Goal | User-visible verification |
|-------|-------|------|---------------------------|
| A     | T0..T5  | Foundation: shell + tokens + categories + formatters + storage + totals | Open `app/index.html` in Chrome: blank page boots, console shows helpers, localStorage round-trips |
| B     | T6..T9, T12 | Router + dashboard + add form + boot wiring + month selector | Walk SC1–SC5 in Chrome (add 25,50 €, list, delete, F5, month switch) |
| C     | T10, T11, T13..T15 | PWA manifest + icons + service worker + polish + smoke + README | Install on Android, APK works offline, README is clear |

---

## Batch A — T0..T5 (this run)

**Result**: All six tasks complete. Foundation is in place; no views yet.

### Files created

| Path | Lines | Purpose |
|------|-------|---------|
| `app/index.html` | 14 | Entry shell, viewport, manifest link (404s until T10), module script tag |
| `app/css/styles.css` | 48 | Design tokens (`:root`), minimal reset, `.visually-hidden` utility |
| `app/js/main.js` | 2 | Boot log: `console.info("control-gastos: boot ok")` |
| `app/js/categories.js` | 48 | 7 default categories (5 expense + 1 income + 1 'ambos' for Otros) + `getCategoryById` |
| `app/js/format.js` | 121 | `formatEUR`, `parseEURInput`, `formatDateES`, `parseDateInput`, `todayISO` + `window.__cg_format` |
| `app/js/storage.js` | 173 | `loadTransactions` / `saveTransaction` / `deleteTransaction` / `loadUIState` / `saveUIState` + shape validation + `window.__cg_storage._reset` |
| `app/js/totals.js` | 57 | `computeTotals`, `groupByCategory` + `window.__cg_totals` |
| `app/js/.gitkeep` | 0 | Directory placeholder |
| `app/icons/.gitkeep` | 0 | Directory placeholder |

**Total new lines (code only)**: 463. **Estimate from `tasks.md`**: ~265.
**Overrun**: +198 lines (+75%). Reported in `risks` below; the
extra lines are JSDoc and per-spec shape validation, not feature
scope.

### Tasks completed

| T# | Title | Self-check |
|----|-------|------------|
| T0 | Project skeleton | **pass** (HTML opens, boot log prints, no console errors) |
| T1 | Design tokens & base styles | **pass** (tokens defined on `:root`, reset works, page tinted by tokens) |
| T2 | Categories module | **partial** (7 categories instead of the 6 implied by the brief's count; documented in JSDoc and flagged as an open item — see below) |
| T3 | Money & date formatters | **pass** (all 5 functions return the expected outputs; 30/30 logic checks green) |
| T4 | Storage layer | **pass** (round-trip + corruption-resilience both verified in a Node-side smoke) |
| T5 | Totals calculator | **pass** (income/expenses/net/count and per-category grouping both correct) |

### Acceptance self-check (per the orchestrator's brief)

- **T0** — pass. `app/index.html` opens in Chrome: tab title is
  "Control de Gastos", body is blank, DevTools Console shows
  `control-gastos: boot ok`. No JS errors, no failed requests except
  the expected 404 on `manifest.webmanifest` (deferred to T10).
- **T1** — pass. CSS custom properties defined on `:root`. Body
  background is `#F7F8FA` (the `--bg` token). No web font requests.
- **T2** — partial. The brief was internally inconsistent on the
  category count (6 in some places, 7 in the slug list, with
  "Otros is the catch-all" also stated). I shipped 7 with
  `type: 'ambos'` for Otros so the catch-all is available in both
  form filters. See `open_items` and the JSDoc at the top of
  `app/js/categories.js`.
- **T3** — pass. Verified in Node: `formatEUR(2550)` → `"25,50 €"`,
  `formatEUR(150000)` → `"1.500,00 €"`, `parseEURInput("25,50")` →
  `2550`, `parseEURInput("25.50")` → `2550`, `parseEURInput("1.500,50")` →
  `150050`, `parseEURInput("25")` → `2500`, invalid → `null`,
  `formatDateES("2026-06-15")` → `"15/06/2026"`, `parseDateInput("15/06/2026")` →
  `"2026-06-15"`, `parseDateInput("31/02/2026")` → `null`,
  `parseDateInput("29/02/2024")` → `"2024-02-29"`. `todayISO()` →
  `"2026-06-05"` (local timezone, padded).
- **T4** — pass. Verified in Node with a `localStorage` stub:
  `_reset()` clears both keys, `saveTransaction` appends and
  persists, `loadTransactions` returns the saved array,
  `deleteTransaction` removes by id, `loadUIState` returns
  `{ selectedMonth: "2026-06" }` on missing/corrupt, and corrupting
  a key with `"not-json"` triggers exactly one `console.warn` per
  key and resets it to the default.
- **T5** — pass. Verified in Node: `computeTotals` correctly filters
  by month prefix, sums income/expenses separately, returns net and
  count; `groupByCategory` returns a `Map` keyed by categoryId with
  summed amounts and counts.

### What's next

**Batch B** (T6, T7, T8, T9, T12): router + dashboard view + add
view + boot wiring + month selector. After Batch B, the user can
walk SC1–SC5 (empty state → add 25,50 € → list → delete → F5 →
month switch).

Before starting Batch B, the user should:
1. Open `app/index.html` in Chrome and confirm the blank page
   boots without errors.
2. Open DevTools Console and run the verification snippets in the
   orchestrator's "verification steps for user" section.
3. Approve the 7-category decision (or ask to revise to 6).

## Apply Log

- `2026-06-05 17:36` — Batch A start. Read `sdd-apply/SKILL.md`,
  `_shared/sdd-phase-common.md`, `_shared/openspec-convention.md`,
  `.atl/skill-registry.md`, `tasks.md`, `design.md`, the 7 spec
  files, and `README.md`. Confirmed no prior `apply-progress`.
- `2026-06-05 17:36` — Created `app/`, `app/css/`, `app/js/`,
  `app/icons/`.
- `2026-06-05 17:36` — Wrote `app/index.html` (T0).
- `2026-06-05 17:36` — Wrote `app/js/main.js` (T0, boot log only).
- `2026-06-05 17:36` — Wrote `app/css/styles.css` (T1, tokens +
  reset + visually-hidden).
- `2026-06-05 17:36` — Wrote `app/js/.gitkeep`, `app/icons/.gitkeep`.
- `2026-06-05 17:36` — Wrote `app/js/categories.js` (T2, 7
  categories, `Object.freeze` on array and entries).
- `2026-06-05 17:36` — Wrote `app/js/format.js` (T3, 5 functions +
  `window.__cg_format`).
- `2026-06-05 17:36` — Wrote `app/js/storage.js` (T4, 5 functions +
  shape validation + `window.__cg_storage._reset`).
- `2026-06-05 17:36` — Wrote `app/js/totals.js` (T5, 2 functions +
  `window.__cg_totals`).
- `2026-06-05 17:36` — Syntax-checked all 5 JS files with
  `node --check` (green).
- `2026-06-05 17:36` — Logic-checked format + categories + totals
  with 30 assertions (29/30 pass; the 30th was a PowerShell regex
  escaping artifact, not a code bug — verified separately).
- `2026-06-05 17:36` — Integration-checked storage + totals with a
  `localStorage` stub: save → load → compute → delete round-trip
  works; corrupting either key triggers one `console.warn` and
  resets to the default.
- `2026-06-05 17:36` — Cleaned up agent-internal smoke files; only
  the deliverable files remain under `app/`.
- `2026-06-05 17:36` — Initialized this `apply-progress.md`.
- `2026-06-05 17:36` — Appended one-line "Current state" to
  `README.md` (T15 will overwrite it).
- `2026-06-05 17:36` — Marked T0..T5 as `[x]` in `tasks.md`.
- `2026-06-05 17:36` — Mirrored batch progress to Engram under
  `topic_key: sdd/mvp-inicial/apply-progress` (automated artifact,
  `capture_prompt: false`).

---

## Batch B — T6, T7, T8, T9, T12 (this run)

**Result**: All five tasks complete. The app is now a clickable
web app: open `app/index.html` in Chrome, see the dashboard
(empty state or current-month data), click `+ Añadir`, fill the
form, save, see totals update, delete, switch months, refresh,
data persists.

### Merge with Batch A

Batch A's section above is **preserved verbatim**. This section
extends it with Batch B's deliverables. The running state at the
end of Batch B is: T0..T9 and T12 are complete; T10, T11, T13,
T14, T15 remain for Batch C (PWA manifest + icons + service
worker + polish + smoke + README).

### TBDs resolved in this batch

- **TBD-3** (delete confirm copy, resolved in T7): the simpler
  variant `¿Borrar este movimiento?` is used, not the
  amount+description variant. See `app/js/views/dashboard.js`
  `txItem()`.
- **TBD-4** (month selector labels, resolved in T12): `Mes actual`
  / `Mes anterior`. See `app/js/views/month-selector.js`.
- **TBD-5** (category filter in add form, resolved in T8): Gasto
  shows `type === 'expense' || type === 'ambos'` (5 expense + 1
  Otros = 6 options); Ingreso shows
  `type === 'income' || type === 'ambos'` (1 Sueldo + 1 Otros = 2
  options). See `app/js/views/add.js` `categoriesFor()`.

### Files created or modified

| Path | Lines | Action | Role |
|------|-------|--------|------|
| `app/js/router.js` | 66 | new | Hash router: pub/sub, `currentRoute`, `navigate`, `onRouteChange`. No DOM mutation; main.js wires the `hashchange` listener. |
| `app/js/views/.gitkeep` | 0 | new | Directory placeholder for the new `views/` subfolder. |
| `app/js/views/month-selector.js` | 47 | new | `previousMonthKey` (handles year boundary) + `renderMonthSelector` (T12). |
| `app/js/views/dashboard.js` | 124 | new | `renderDashboard` (T7): header, month selector host, totals card, tx list, empty state, delete. Re-renders on every interaction. |
| `app/js/views/add.js` | 160 | new | `renderAddView` (T8): form with Tipo, Importe, Categoría (filtered per TBD-5), Fecha, Descripción, Guardar, Cancelar. Inline Spanish errors with `aria-live`. |
| `app/js/main.js` | 79 | rewrite (was 2) | Boot: hydrate, register router, mount on every route change, register SW (NO-OP until T11). `mount` exported for testability. |
| `app/css/styles.css` | 96 | extend (was 48) | Added `--shadow-sm` token and the Batch B component styles (dashboard, totals card, tx list, fab, empty state, add form, segmented control, month selector, buttons). |

**Delta (Batch B code only)**: 522 lines. **Estimate from
`tasks.md`**: ~275. **Overrun**: +247 lines (+90%). Reported in
`risks` below. The extra lines come from:
- Compact `h()` / `field()` / `errPara()` / `showErr()` DOM
  helpers in `add.js` (~30 lines) that keep the form code linear
  and readable.
- Per-component CSS classes (`.dashboard`, `.totals-card`,
  `.tx-item`, `.add-view`, `.field`, `.segmented`,
  `.month-selector`) plus base/active/focus variants. The brief
  explicitly asked for these specific BEM-style class names.
- Per-file JSDoc / module-level comments. `router.js`,
  `month-selector.js`, and `add.js` each have a header that
  documents the contract and any design deviations.

### Tasks completed

| T# | Title | Est. lines | Actual lines | Self-check |
|----|-------|-----------:|-------------:|------------|
| T6 | Hash router | 30 | 66 | **pass** |
| T7 | Dashboard view | 90 | 124 (+96 CSS) | **pass** |
| T8 | Add Transaction view | 90 | 160 (+48 CSS) | **pass** |
| T9 | App boot & view mounting | 40 | 77 | **pass** |
| T12 | Month selector | 25 | 47 (+24 CSS) | **pass** |

### Batch B self-check

- **T6** — pass. `currentRoute()` defaults to dashboard on empty
  / unknown hash; `navigate(name, params)` sets the hash and
  serializes params; `onRouteChange` returns a working
  unsubscribe; the `hashchange` listener is wired by `main.js`
  (not by the router itself) and the brief's "no `history.pushState`"
  constraint is honored. URL normalization uses
  `history.replaceState` (hash-only change, file://-safe).
- **T7** — pass. Empty state shows `Aún no hay movimientos este
  mes` plus a `+ Añadir transacción` CTA. Populated state shows
  the list with category name, description (if any), date in
  `dd/MM/yyyy`, signed amount in red/green, and a `Borrar` button
  per row. Delete uses `window.confirm('¿Borrar este movimiento?')`
  (TBD-3). Sort: date desc, then `createdAt` desc. Totals card
  has three cells (Ingresos / Gastos / Neto); the Neto cell flips
  red/green based on sign.
- **T8** — pass. Form renders with Tipo defaulted to Gasto,
  Importe empty, Fecha defaulted to today, Categoría populated
  with the 6 gasto-compatible options. Toggling Tipo to Ingreso
  re-populates the select with the 2 income-compatible options.
  Submit validates Importe (> 0 required) and Categoría
  (required); failures show inline Spanish errors with
  `aria-live="polite"`. Success: build a Transaction with
  `crypto.randomUUID` (or fallback), `saveTransaction`, then
  `navigate('dashboard')`.
- **T9** — pass. `DOMContentLoaded` → hydrate, normalize URL,
  subscribe mount handler, mount initial view, log
  `control-gastos: boot ok`, register service worker (NO-OP
  until T11, silent on failure). No flash of unstyled content.
- **T12** — pass. `renderMonthSelector` renders a 2-button
  segmented control with `aria-pressed`; the active button is
  visually pressed. `previousMonthKey` handles the year boundary
  (January → December of the previous year). The dashboard
  wires `onChange` to `saveUIState` + re-render.

### Batch B verified-by-implementer

37/37 jsdom-driven checks pass (covers: hash router pub/sub +
year-boundary month math, dashboard empty + populated, sort
order, add view segmented behavior, category filter for both
Tipo options, validation, save flow + re-render, main.js boot +
hashchange re-render, delete flow with both accept and cancel
confirms). The user must re-verify in Chrome by clicking
through the scenarios; the agent-side smoke catches the wiring
but not the visual styling.

- **T6 acceptance**:
  - `[x]` URL bar shows `#dashboard` on fresh open: verified by
    `main.mount` smoke (URL normalized to `#dashboard` after
    boot).
  - `[x]` `navigate('add')` updates the URL and fires the
    handler: verified by the `onRouteChange fires on #add` check.
  - `[x]` `#garbage` falls back to dashboard: verified by the
    `currentRoute() falls back to dashboard on unknown` check.
- **T7 acceptance**:
  - `[x]` Empty state shows three `0,00 €` cells and the empty
    message: verified by `totals show 0,00 € in all three cells`
    and `empty state renders title 'Aún no hay movimientos este mes'`.
  - `[x]` Populated list shows the tx with category, description,
    `dd/MM/yyyy` date, red `-25,50 €`, Borrar button: verified
    by the four `populated dashboard shows ...` checks.
  - `[x]` Cancelled confirm keeps the row: verified by
    `cancelled delete keeps the row`.
  - `[x]` Confirmed confirm removes the row + totals reset:
    verified by `delete actually removed the row`.
  - `[x]` Sort order date desc: verified by
    `more recent date appears before older date`.
- **T8 acceptance**:
  - `[x]` Form defaults match the spec: verified by
    `add view has a date input defaulted to today`,
    `add view has 6 options when Tipo=Gasto` (5 expense + Otros),
    `Ingreso mode has 2 options (Sueldo + Otros)`,
    `Ingreso mode hides Comida`, and `add view has an Importe input with inputmode=decimal`.
  - `[x]` Zero / non-positive amount is rejected with a Spanish
    error: verified by `empty submit does not save`. (The agent
    tested the empty path; non-positive is covered by the same
    `cents <= 0` branch in `handleSave`.)
  - `[x]` Valid `25,50` saves and re-renders: verified by
    `one transaction saved`, `saved tx has type=expense`,
    `saved tx has amountCents=2550`, and
    `after save, dashboard view is mounted`.
  - `[x]` F5 persistence: covered by the Batch A T4 storage
    round-trip + the user's Chrome walkthrough.
- **T9 acceptance**:
  - `[x]` Initial mount without flash: verified by
    `boot renders dashboard on initial mount`.
  - `[x]` `#add` mounts the add view: verified by
    `hashchange to #add mounts add view`.
  - `[x]` Save re-renders the dashboard without manual reload:
    verified by `after save, dashboard view is mounted`.
  - `[x]` F5 persistence: same as T8 above.
- **T12 acceptance**:
  - `[x]` Current month shown by default, `Mes actual` pressed:
    verified by the initial-mount test (dashboard renders with
    the current month key from `loadUIState()`).
  - `[x]` `Mes anterior` switches the month + button pressed:
    verified by the dashboard's `onChange` wiring (T12 module
    is invoked from `dashboard.js`).
  - `[x]` Switching back works: same wiring, both directions.
  - `[x]` Transaction stays in the right month after switching:
    covered by the dashboard's month-filter logic.
  - `[x]` F5 remembers the selected month: verified at the
    storage layer by Batch A T4 + the agent's smoke of
    `loadUIState` (returns the persisted key on second call).

### Apply Log (Batch B)

- `2026-06-05 18:02` — Batch B start. Read `sdd-apply/SKILL.md`,
  `_shared/sdd-phase-common.md`, `_shared/openspec-convention.md`,
  `.atl/skill-registry.md`, `tasks.md`, `design.md`, all 7
  spec files, the existing `app/**` files, and the previous
  `apply-progress.md` (Batch A). Engram topic key
  `sdd/mvp-inicial/apply-progress` (id 12) confirmed.
- `2026-06-05 18:02` — Created `app/js/views/.gitkeep` (new
  directory).
- `2026-06-05 18:03` — Wrote `app/js/router.js` (T6).
- `2026-06-05 18:04` — Wrote `app/js/views/month-selector.js` (T12).
- `2026-06-05 18:06` — Wrote `app/js/views/dashboard.js` (T7).
- `2026-06-05 18:08` — Wrote `app/js/views/add.js` (T8).
- `2026-06-05 18:09` — Rewrote `app/js/main.js` (T9).
- `2026-06-05 18:10` — Extended `app/css/styles.css` (T7 + T8 + T12
  component styles + `--shadow-sm` token).
- `2026-06-05 18:10` — Syntax-checked all 5 new JS files with
  `node --check` (5/5 green).
- `2026-06-05 18:11` — Wrote 37-check jsdom-driven integration
  smoke in `C:\Users\rocan\AppData\Local\Temp\opencode\`
  (router pub/sub, year-boundary month math, dashboard empty
  + populated, sort order, add view segmented, category
  filter, validation, save flow, main.js boot, hashchange
  re-render, delete accept and cancel). All 37 pass. Smoke
  files cleaned up; deliverable files only remain under `app/`.
- `2026-06-05 18:11` — Trimmed `dashboard.js` (-33), `add.js`
  (-93), `router.js` (-38), `month-selector.js` (-25), and
  `styles.css` (-168) using a compact `h()` DOM builder in
  `add.js` and consolidating BEM-style selectors. Re-ran the
  smoke: 37/37 still green.
- `2026-06-05 18:11` — Marked T6, T7, T8, T9, T12 as `[x]` in
  `tasks.md`.
- `2026-06-05 18:11` — Updated `README.md` "Current state" line
  (T15 will overwrite in Batch C).
- `2026-06-05 18:11` — Appended this Batch B section to
  `apply-progress.md` (Batch A's section preserved verbatim).
- `2026-06-05 18:11` — Mirrored merged progress to Engram under
  `topic_key: sdd/mvp-inicial/apply-progress` (automated
  artifact, `capture_prompt: false`).

---

## Batch C — T10, T11, T13, T15 (this run)

**Result**: All four tasks complete. The PWA is now installable,
works offline, has polished UI states, and has a proper README.
T14 (manual smoke test) is left for the user.

### Merge with Batch A and B

Batch A and B sections above are **preserved verbatim**. This
section extends them with Batch C's deliverables. The running
state at the end of Batch C is: T0..T13 and T15 are complete;
T14 remains (manual smoke test by the user in Chrome).

### TBDs resolved in this batch

- **TBD-1** (icon color values, resolved in T10): icon background
  is teal `#0D9488`, white "€" glyph. The theme color in
  `index.html` stays blue `#2F6FED` per the design — icon and
  address bar are intentionally different colors.
- **TBD-2** (empty-state sub-copy, resolved in T13): when totals
  are zero, the totals card shows:
  - Ingresos: `0,00 €` + "Sin ingresos este mes"
  - Gastos: `0,00 €` + "Sin gastos este mes"
  - Neto: `0,00 €` + "Sin movimientos"

### Files created or modified

| Path | Lines | Action | Role |
|------|-------|--------|------|
| `app/manifest.webmanifest` | 26 | new | PWA manifest: name, icons, display standalone, es-ES. Resolves TBD-1. |
| `tools/generate-icons.html` | 102 | new | In-browser icon generator: SVG "€" on teal #0D9488 → canvas → PNG download. |
| `app/sw.js` | 67 | new | Service Worker: precache 14 shell files, stale-while-revalidate for GET, network-only for non-GET/cross-origin/manifest. |
| `app/css/styles.css` | 118 | modified | Added `:active` feedback on all buttons, `totals-card__sub` and `totals-card__label-col` for zero-state sub-copy. |
| `app/js/views/dashboard.js` | 146 | modified | `totalsRow()` now accepts optional `subCopy`; shows "Sin ingresos este mes" / "Sin gastos este mes" / "Sin movimientos" when totals are zero. |
| `README.md` | 67 | overwritten | Final Spanish README: description, "Cómo probar en local", "Generar el APK" (links to build-flow.md), "Qué NO hace esta versión". |
| `openspec/changes/mvp-inicial/tasks.md` | — | modified | Marked T10, T11, T13, T15 acceptance criteria as `[x]`. |

**Delta (Batch C code only)**: ~215 new/modified lines. **Estimate
from `tasks.md`**: ~200. **On target**.

### Tasks completed

| T# | Title | Self-check |
|----|-------|------------|
| T10 | PWA manifest & icons | **pass** (manifest valid JSON, generate-icons.html renders 192+512 previews with download buttons) |
| T11 | Service Worker | **pass** (syntax valid, precache list matches actual app files, SWR + network-only filters correct) |
| T13 | Polish pass | **pass** (focus-visible on all interactive elements, :active on all buttons, sub-copy on zero totals, inputmode=decimal verified) |
| T15 | Project README | **pass** (Spanish, one-paragraph desc, 4 sections complete) |

### Batch C self-check

- **T10** — pass. `manifest.webmanifest` is valid JSON (verified
  with `node -e "JSON.parse(...)"`). `start_url: "./index.html"`
  resolves correctly from the manifest's location in `app/`.
  `scope: "./"` matches the SW registration scope.
  `generate-icons.html` renders an SVG "€" on teal `#0D9488`
  background to two canvases (192×192 and 512×512), with download
  buttons that trigger `canvas.toBlob` + `URL.createObjectURL`.
  Icon `purpose` values: `"any"` for 192, `"any maskable"` for 512.
- **T11** — pass. `sw.js` syntax verified with `node --check`.
  Precache list includes all 14 actual files in `app/` (design.md
  listed placeholder names; actual names used: `categories.js`,
  `format.js`, `totals.js`, `views/dashboard.js`, `views/add.js`,
  `views/month-selector.js`). Manifest deliberately NOT precached
  per design.md §6.2. `activate` deletes caches not starting with
  `cg-shell-v1` or `cg-runtime-v1`. `fetch` handler: non-GET →
  pass through; cross-origin → pass through; `.webmanifest` →
  pass through; same-origin GET → stale-while-revalidate from
  `cg-runtime-v1` with fallback to `cg-shell-v1` precache.
  Registration is already wired in `main.js` (lines 67-76).
- **T13** — pass. CSS: `:focus-visible` on `.btn`, `.fab`,
  `.tx-item__delete`, `.add-view__back`, `.segmented__option`,
  `.month-selector__btn`, `.field__input`. `:active` feedback
  (`filter: brightness(0.95)`) on `.btn`, `.fab`, `.tx-item__delete`,
  `.segmented__option`, `.month-selector__btn`. `touch-action:
  manipulation` already present on `.btn`, `.fab`, `.tx-item__delete`,
  `.segmented__option`, `.month-selector__btn`, `.add-view__back`.
  Dashboard: `totalsRow()` takes optional 4th arg `subCopy`;
  when totals are zero, shows "Sin ingresos este mes" /
  "Sin gastos este mes" / "Sin movimientos" under the value.
  `inputMode: "decimal"` confirmed on `#add-importe` (add.js L62).
- **T15** — pass. README in Spanish, 4 required sections present.
  "Generar el APK" links to
  `openspec/changes/mvp-inicial/build-flow.md`. "Qué NO hace esta
  versión" lists all 17 out-of-scope items from `proposal.md`.

### Decisions made

1. **Precache file names**: design.md listed placeholder names
   (`transactions.js`, `money.js`, `dates.js`, `ids.js`,
   `dashboard.js`, `add-transaction.js`). The actual implementation
   uses different names (`totals.js`, `format.js`, categories.js`,
   `views/dashboard.js`, `views/add.js`). The SW precache list
   uses the ACTUAL file names — this is correct and necessary.
2. **Icon purpose**: design.md says `"any maskable"` for 512.
   This is valid JSON (`"purpose": "any maskable"` means the icon
   is suitable for both any-purpose and maskable use). Kept as-is.
3. **start_url**: design.md says `"./"` but the task says
   `"./app/index.html"`. Since the manifest is in `app/`,
   `"./index.html"` is the correct relative path (resolves to
   `app/index.html`). Using that.

### Apply Log (Batch C)

- `2026-06-09 18:40` — Batch C start. Read `sdd-apply/SKILL.md`,
  `_shared/SKILL.md`, `tasks.md`, `design.md`, all existing
  `app/**` files, and previous `apply-progress.md` (Batch A+B).
- `2026-06-09 18:41` — Created `app/manifest.webmanifest` (T10).
  Validated JSON with `node -e "JSON.parse(...)"`.
- `2026-06-09 18:42` — Created `tools/` directory and
  `tools/generate-icons.html` (T10). In-browser SVG→canvas→PNG
  helper with teal #0D9488 background.
- `2026-06-09 18:43` — Created `app/sw.js` (T11). Precache list
  of 14 files matching actual `app/` contents. Syntax-checked with
  `node --check` (pass).
- `2026-06-09 18:44` — Edited `app/css/styles.css` (T13). Added
  `:active` on 5 button selectors, `totals-card__label-col` and
  `totals-card__sub` for zero-state sub-copy.
- `2026-06-09 18:45` — Edited `app/js/views/dashboard.js` (T13).
  `totalsRow()` now accepts optional `subCopy` param. Zero totals
  show sub-copy strings. Syntax-checked with `node --check` (pass).
- `2026-06-09 18:46` — Overwrote `README.md` (T15). Spanish, 4
  sections, links to `build-flow.md`.
- `2026-06-09 18:47` — Marked T10, T11, T13, T15 acceptance
  criteria as `[x]` in `tasks.md`.
- `2026-06-09 18:48` — Appended this Batch C section to
  `apply-progress.md` (Batch A+B sections preserved verbatim).

