# Tasks: mvp-inicial (Control de Gastos v0.1)

> Implementation plan for the v0.1 PWA. Greenfield project. Vanilla
> HTML + CSS + ES modules + `localStorage`, no build step.
> Implements the approved `proposal.md`, the 7 capability specs
> (26 scenarios total), and the technical design in `design.md`.
> Dependency order mirrors `design.md` §5. Verification is manual
> in Chrome against the spec scenarios (no test framework —
> `strict_tdd: false` per `openspec/config.yaml`).
>
> The full plan is **one** `sdd-apply` run. The 400-line review
> budget is exceeded; see the **Review Workload Forecast** below
> and the proposed batch split. The orchestrator uses the cached
> `ask-always` strategy to ask the user how to proceed.

## Review Workload Forecast

| Field                       | Value                                                                                       |
|-----------------------------|---------------------------------------------------------------------------------------------|
| Estimated changed lines     | ~740 (rough sum; excludes the two binary PNGs in `app/icons/`)                              |
| 400-line budget risk        | **High**                                                                                    |
| Chained PRs recommended     | **Yes** (batch split — no VCS yet, so "PRs" map to multiple `sdd-apply` sessions)            |
| Suggested split             | Batch A (T0..T5) — Batch B (T6..T9, T12) — Batch C (T10, T11, T13..T15)                      |
| Delivery strategy           | `ask-always` (cached)                                                                       |
| Chain strategy              | `pending` — orchestrator asks the user                                                      |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units (batches)

| Batch | Tasks                | Goal                                                          | User can verify by                                          | Est. lines |
|-------|----------------------|---------------------------------------------------------------|-------------------------------------------------------------|-----------|
| A     | T0, T1, T2, T3, T4, T5 | Skeleton + design tokens + categories + money/dates + storage + totals | Open `app/index.html` in Chrome: blank page boots, no errors | ~260      |
| B     | T6, T7, T8, T9, T12  | Router + dashboard + add form + boot + month selector         | Walk SC1–SC5 in Chrome (add 25,50 €, list, delete, F5, month switch) | ~280 |
| C     | T10, T11, T13, T14, T15 | PWA manifest + icons + service worker + polish + smoke + README | Install on Android, APK works, README is clear              | ~200      |

If the user accepts the split, the orchestrator runs **three**
`sdd-apply` sessions — one per batch. Between batches the user
opens the file in Chrome to verify the slice works end-to-end.

If the user rejects the split and accepts a `size:exception`, the
full plan runs in one `sdd-apply` session. Both are valid; the
user decides.

### TBD-to-task map (from `design.md` §9)

| TBD | Title                            | Resolved in |
|-----|----------------------------------|-------------|
| 1   | Icon color values                | T10         |
| 2   | Empty-state copy                 | T13         |
| 3   | Delete confirm dialog copy       | T7          |
| 4   | Month selector labels            | T12         |
| 5   | Category filter in add form      | T8          |

---

## Tasks

## Task 0: Project skeleton

- **Depends on:** -
- **Files touched:**
  - `app/index.html` (new) — entry shell with viewport, title, theme-color meta, manifest link, module script tag.
  - `app/js/main.js` (new) — empty module that calls `console.log("boot")`.
  - `app/css/styles.css` (new) — empty placeholder.
- **Implements spec scenarios:** foundation only (every scenario needs the shell to exist).
- **Resolves TBDs:** -
- **Estimated changed lines:** ~25
- **Acceptance criteria:**
  - [x] Open `app/index.html` in Chrome via `file://`: the tab title is "Control de gastos" and the page body is blank.
  - [x] Chrome DevTools Console shows the text `boot`.
  - [x] No JavaScript errors and no failed requests in DevTools.
- **Notes:** The `<link rel="manifest" href="manifest.webmanifest">` will 404 until T10 creates the file; the 404 is silent and does not break rendering. `theme-color` is `#2F6FED` (the `--accent` token from the design).

## Task 1: Design tokens & base styles

- **Depends on:** T0
- **Files touched:**
  - `app/css/styles.css` (filled in) — design tokens on `:root`, minimal CSS reset, system font stack, spacing scale, `.card`, `.btn`, `.input`, layout primitives.
- **Implements spec scenarios:** localization (visual baseline; the Spanish copy itself lands in T7/T8/T13).
- **Resolves TBDs:** -
- **Estimated changed lines:** ~80
- **Acceptance criteria:**
  - [x] Open `app/index.html` in Chrome: the browser address bar is tinted blue (`#2F6FED`) on mobile, confirming the theme-color meta.
  - [x] The CSS custom properties from `design.md` §4.3 are all defined on `:root` (visible via DevTools Elements > `:root > Computed`).
  - [x] The font is the system stack (no web font network request in DevTools Network).
  - [x] Adding a temporary `<h1>Hola</h1>` to `index.html` renders with no margin from the browser default (reset works).
- **Notes:** Use the exact token values from `design.md` §4.3 — do not invent new ones in T1. Tokens are referenced everywhere later.

## Task 2: Categories module

- **Depends on:** T0
- **Files touched:**
  - `app/js/categories.js` (new) — frozen `const CATEGORIES` array with the 8 entries from `design.md` §2.2 (`cat-comida`, `cat-transporte`, `cat-ocio`, `cat-compras`, `cat-alquiler`, `cat-ahorro`, `cat-sueldo`, `cat-otros`); each entry has `id`, `name`, `type` (`gasto` | `ingreso` | `ambos`), `icon` (short uppercase tag: `COM`, `BUS`, `OC`, `CPR`, `ALQ`, `AHO`, `SUE`, `+`), `color: null`.
- **Implements spec scenarios:** categories — "The eight default categories appear in the add form" and "No category editor is reachable from the UI".
- **Resolves TBDs:** -
- **Estimated changed lines:** ~20
- **Acceptance criteria:**
  - [x] In DevTools Console, running `import('./app/js/categories.js').then(m => console.log(m.CATEGORIES.length))` prints `8`.
  - [x] The 8 category ids match `design.md` §2.2 exactly (verify by inspecting the exported array).
  - [x] `Object.freeze` is applied (the array and each entry are immutable; assigning to `CATEGORIES[0].name = 'X'` throws in strict mode).
- **Notes:** No DOM, no storage. This file is consumed by the add form (T8) and the dashboard list (T7). The `icon` field is a short uppercase text tag per `design.md` §2.2 — used as a visual cue in the list. `color: null` everywhere in v0.1; the row accent is driven by `type` only.

## Task 3: Money & date formatters

- **Depends on:** T0
- **Files touched:**
  - `app/js/money.js` (new) — `formatEUR(cents)` returns `"25,50 €"`; `parseEURInput(str)` accepts both `,` and `.`, returns integer cents, throws on empty / non-numeric / non-positive.
  - `app/js/dates.js` (new) — `formatDateShort(iso)` returns `"25/06/2026"`; `parseDateInput(str)` accepts `dd/MM/yyyy`, returns ISO `YYYY-MM-DD`; `currentMonthISO()` returns `"YYYY-MM"`; `monthLabel("2026-06")` returns `"Junio 2026"` in Spanish.
- **Implements spec scenarios:** localization — "Transaction dates render in dd/MM/yyyy" and "Amounts display with comma decimal and euro symbol". Also closes the design's R-spec-1.
- **Resolves TBDs:** -
- **Estimated changed lines:** ~50
- **Acceptance criteria:**
  - [x] In DevTools Console: `formatEUR(2550)` returns the string `"25,50 €"`; `parseEURInput("25,50")` returns `2550`; `parseEURInput("25.50")` also returns `2550`.
  - [x] `parseEURInput("0")` and `parseEURInput("-5")` both throw a `RangeError`.
  - [x] `formatDateShort("2026-06-25")` returns `"25/06/2026"`; `parseDateInput("25/06/2026")` returns `"2026-06-25"`.
  - [x] `parseDateInput("31/02/2026")` throws (Feb 31 is impossible).
  - [x] `monthLabel(currentMonthISO())` returns the current month in Spanish with the first letter capitalized (e.g. `"Junio 2026"`).
- **Notes:** The error message thrown by `parseEURInput` is `"El importe debe ser mayor que cero"` (Spanish) — the add form (T8) catches and displays it. `monthLabel` uses a 12-entry Spanish array; do not use `Intl.DateTimeFormat` (extra dependency on the runtime; we keep it explicit for v0.1).

## Task 4: Storage layer

- **Depends on:** T0
- **Files touched:**
  - `app/js/storage.js` (new) — `loadTransactions()`, `saveTransactions(list)`, `loadUiState()`, `saveUiState(state)`. Two `localStorage` keys only: `cg:v1:transactions` and `cg:v1:ui-state`. On parse failure or shape mismatch, log `console.warn(...)` once and reset the key to its default.
- **Implements spec scenarios:** local-storage — "Transactions survive a tab reload", "First run with no stored data shows the empty state", and (partially) "No network call is required to use the app" (no fetch calls in this file).
- **Resolves TBDs:** -
- **Estimated changed lines:** ~60
- **Acceptance criteria:**
  - [x] On first open of `app/index.html`, `loadTransactions()` returns `[]` and `loadUiState()` returns `{ selectedMonth: <current month YYYY-MM> }`.
  - [x] Save one transaction via `saveTransactions([{...}])`, reload the page with F5, run `loadTransactions()` in the Console: the array contains the saved transaction.
  - [x] In DevTools Application > Local Storage, the two keys `cg:v1:transactions` and `cg:v1:ui-state` exist; no other `cg:*` keys are present.
  - [x] Manually corrupt one key (set its value to `"not-json"` in DevTools), reload: a `console.warn` is logged once and the key is reset to its default.
- **Notes:** No `cg:v1:categories` key — categories are hardcoded per `design.md` §3.2. The validation function checks that the parsed value is an array of objects with the expected fields (best-effort shape check; not a full schema validator — keep it readable).

## Task 5: Totals calculator

- **Depends on:** T2, T3, T4
- **Files touched:**
  - `app/js/transactions.js` (new, partial) — exports `computeTotals(transactions, monthKey)` returning `{ income, expenses, net, count }` (all in cents, plus a count of rows). Also exports `listForMonth(transactions, monthKey)` returning the rows for that month, sorted by `date` desc then `createdAt` desc.
- **Implements spec scenarios:** monthly-totals — "Compute income, expenses, and net for the viewed month"; transactions — "Current-month list is sorted by date descending".
- **Resolves TBDs:** -
- **Estimated changed lines:** ~30
- **Acceptance criteria:**
  - [x] In the Console: `computeTotals([{type:'gasto',amountCents:2550,date:'2026-06-10',createdAt:'2026-06-10T10:00:00Z',...}], '2026-06')` returns `{ income: 0, expenses: 2550, net: -2550, count: 1 }`.
  - [x] `computeTotals([{type:'gasto',amountCents:2550,date:'2026-05-10',...}, {type:'ingreso',amountCents:10000,date:'2026-06-01',...}], '2026-06')` returns `{ income: 10000, expenses: 0, net: 10000, count: 1 }` (the May expense is excluded).
  - [x] `listForMonth([{date:'2026-06-03',createdAt:'2026-06-03T08:00:00Z',...}, {date:'2026-06-15',createdAt:'2026-06-15T08:00:00Z',...}], '2026-06')` returns the rows in order [15th, 3rd].
- **Notes:** `computeTotals` is a **pure function** — no side effects, no storage. T9 will add `addTransaction` and `deleteTransaction` to this same file (those DO write to storage). For T5, only the two pure helpers are required.

## Task 6: Hash router

- **Depends on:** T0
- **Files touched:**
  - `app/js/router.js` (new) — `initRouter(onChange)` that wires `window.addEventListener('hashchange', ...)` and reads the initial `location.hash`; `navigate(hash)` that sets `location.hash`. Two routes: `#dashboard` (default) and `#add`. Unknown hashes fall back to `#dashboard`.
- **Implements spec scenarios:** monthly-view (foundation; the actual month switching is wired in T12).
- **Resolves TBDs:** -
- **Estimated changed lines:** ~30
- **Acceptance criteria:**
  - [x] Open `app/index.html` in Chrome: the URL bar shows `file:///.../app/index.html#dashboard`.
  - [x] In the Console, call `navigate('#add')`: the URL bar updates to `#add` and `onChange` fires once with `{ route: 'add' }`.
  - [x] Manually edit the URL to `#garbage` and press Enter: the URL snaps back to `#dashboard` and `onChange` fires with `{ route: 'dashboard' }`.
- **Notes:** Hash routing (not `history.pushState`) because under `file://` the `history` API silently reloads the page — see `design.md` §1.

## Task 7: Dashboard view

- **Depends on:** T2, T3, T4, T5, T6
- **Files touched:**
  - `app/js/dashboard.js` (new) — `renderDashboard(root, state)` that renders the 3-cell totals card (Ingresos, Gastos, Neto), the month label, the transactions list, the empty-state message, and the "Añadir transacción" button.
  - `app/index.html` (minor edit) — add a `<section id="view-dashboard">` placeholder so the router has something to mount into.
- **Implements spec scenarios:** transactions — "Add an expense and see it in the list" (render side), "Current-month list is sorted by date descending", "Empty month shows the empty-state message", "Confirmed delete removes the transaction", "Cancelled confirmation keeps the transaction"; monthly-totals — "Empty month shows zero totals and the empty-state message", "Deleting a transaction recalculates the totals".
- **Resolves TBDs:** TBD-3 (delete confirm dialog copy — pick `¿Borrar este movimiento?` for v0.1; do not include amount/description in the prompt).
- **Estimated changed lines:** ~90
- **Acceptance criteria:**
  - [x] Open `app/index.html` with no data: the dashboard shows `0,00 €` in all three totals, the month label is the current month in Spanish (e.g. `Junio 2026`), and the list area shows "Aún no hay movimientos este mes".
  - [x] Manually call `saveTransactions` with one expense of 25,50 € dated today, reload the page with F5: the transaction appears in the list, formatted as `-25,50 €` (red), with the date in `dd/MM/yyyy`, the category name, and a visible delete button.
  - [x] Click the delete button, click "Cancelar" in the `window.confirm` dialog: the transaction stays and the totals are unchanged.
  - [x] Click the delete button, click "Aceptar" in the `window.confirm` dialog: the transaction disappears from the list, the totals go back to `0,00 €`, and reloading with F5 keeps it gone.
  - [x] Manually save two transactions on different days in the same month, reload: the more recent date appears above the older one.
- **Notes:** T7 renders the **current month only** — the month selector is wired in T12. The delete handler calls `saveTransactions` (storage) after filtering out the id. The "Añadir transacción" button calls `navigate('#add')`. For v0.1 the row accent is driven by `type` (red for `gasto`, green for `ingreso`) using the `--expense` and `--income` tokens.

## Task 8: Add Transaction view

- **Depends on:** T2, T3, T4, T6
- **Files touched:**
  - `app/js/add-transaction.js` (new) — `renderAddTransaction(root, state)` that renders the form (Tipo radio, Importe text, Fecha native picker, Categoría select, Descripción text) and a "Guardar" button.
  - `app/index.html` (minor edit) — add a `<section id="view-add">` placeholder.
- **Implements spec scenarios:** transactions — "Add an expense and see it in the list" (input side), "Reject a transaction with non-positive amount"; categories — "The eight default categories appear in the add form".
- **Resolves TBDs:** TBD-5 (category filter — when `Tipo=Gasto`, hide `Sueldo`; when `Tipo=Ingreso`, hide the six `gasto`-only ones; `Otros` always visible).
- **Estimated changed lines:** ~90
- **Acceptance criteria:**
  - [x] Navigate to `#add`: the form renders with Tipo defaulted to "Gasto", Importe empty, Fecha defaulted to today, Categoría showing the 7 gasto-compatible options (Comida, Transporte, Ocio, Compras, Alquiler, Ahorro, Otros), and an empty Descripción.
  - [x] Switch Tipo to "Ingreso": the Categoría select now shows only `Sueldo` and `Otros` (the six gasto-only options are gone).
  - [x] Enter `0` in Importe and click "Guardar": nothing is saved, an inline Spanish error appears next to Importe (`"El importe debe ser mayor que cero"`), and the user stays on the add view.
  - [x] Enter `25,50` in Importe, choose Comida, leave the rest, click "Guardar": the new transaction is written to storage and the user is navigated back to `#dashboard`, where the row appears and Gastos shows `25,50 €`.
  - [x] Reload with F5: the saved transaction is still there.
- **Notes:** Use `<input type="date">` for Fecha (native picker). The display format in the picker depends on Chrome's `es-ES` locale; the list always renders `dd/MM/yyyy` via `formatDateShort` (T3). Use `<input type="text" inputmode="decimal">` for Importe — accepts both `,` and `.`. After a successful save, call `navigate('#dashboard')` and let the dashboard re-render (T9's boot wires the re-render).

## Task 9: App boot & view mounting

- **Depends on:** T4, T6, T7, T8
- **Files touched:**
  - `app/js/main.js` (filled out) — `hydrate` (load storage), `initRouter` (mount the right view on every `onChange`), re-render the active view after any storage write.
  - `app/index.html` (minor edit) — ensure the `<main>` element wraps both `<section id="view-dashboard">` and `<section id="view-add">`.
- **Implements spec scenarios:** local-storage — "Transactions survive a tab reload" (wiring), "First run with no stored data shows the empty state" (wiring); transactions — "Add an expense and see it in the list" (full flow).
- **Resolves TBDs:** -
- **Estimated changed lines:** ~40
- **Acceptance criteria:**
  - [x] Open `app/index.html` with no data: the dashboard mounts immediately and shows `0,00 €` + the empty-state message. No flash of unstyled content.
  - [x] Click "Añadir transacción" in the dashboard: the add view mounts in place; the dashboard is hidden.
  - [x] Fill the form, save: the user is taken back to the dashboard and the new row appears **without a manual reload** (verifies the re-render on storage write).
  - [x] Reload with F5: the saved transaction is still listed.
- **Notes:** T9 does **not** register the service worker — that is T11. Re-rendering strategy: simplest is to call `renderDashboard` / `renderAddTransaction` again on every navigation. Keep `main.js` short and readable — it is the entry point the user (or future maintainer) will read first.

## Task 10: PWA manifest & icons

- **Depends on:** T0
- **Files touched:**
  - `app/manifest.webmanifest` (new) — JSON with the fields from `design.md` §6.1 (`name`, `short_name`, `start_url`, `scope`, `display: standalone`, `orientation: portrait`, `background_color`, `theme_color`, `lang: es-ES`, `dir: ltr`, `icons` array).
  - `app/icons/icon-192.png` (new) — generated by the helper.
  - `app/icons/icon-512.png` (new) — generated by the helper.
  - `tools/generate-icons.html` (new) — single-page HTML helper. Loads an inline SVG (`<rect>` background + `<text>` "€" centered), renders it to a 192×192 canvas and a 512×512 canvas, exports the two PNGs via `canvas.toBlob`, and offers them as downloads ("Save icon-192.png", "Save icon-512.png"). The user opens this file in Chrome, clicks each download, and saves the two files into `app/icons/`.
- **Implements spec scenarios:** pwa-install — "Web App Manifest enables 'Install app'" (manifest part).
- **Resolves TBDs:** TBD-1 (icon color shades — the implementer picks the specific teal; suggested `#0D9488`).
- **Estimated changed lines:** ~70 (manifest JSON + helper HTML, **not** counting the two binary PNGs)
- **Acceptance criteria:**
  - [x] Open `tools/generate-icons.html` in Chrome: the page shows a 192×192 and a 512×512 preview of the icon (a stylized "€" glyph on a teal background, in the central safe zone for the maskable variant).
  - [x] Click the "Download icon-192.png" and "Download icon-512.png" buttons; save the two files into `app/icons/`.
  - [x] `app/manifest.webmanifest` is valid JSON (DevTools Network tab: status 200 when the manifest link is fetched).
  - [x] In DevTools Application > Manifest, the manifest is parsed and the icons are visible.
  - [x] Open `app/index.html` in Chrome on Android: the browser menu shows "Instalar app" or "Añadir a pantalla de inicio" (the install prompt appears).
- **Notes:** The user has **no Node, no ImageMagick, no CLI** — the in-browser helper is the only viable icon path. The teal background is a deliberate departure from the design's blue `--accent` (`#2F6FED`); the theme color in `index.html` stays blue per the design. Document this in the helper page so the user understands why the icon and the address bar are different colors.

## Task 11: Service Worker

- **Depends on:** T0, T10
- **Files touched:**
  - `app/sw.js` (new) — `install` (precache the shell list from `design.md` §6.2, then `skipWaiting()`), `activate` (delete caches whose names do not start with `cg-shell-v` or `cg-runtime-v`, then `clients.claim()`), `fetch` (network-only for non-GET / cross-origin / `*.webmanifest`; stale-while-revalidate from `cg-runtime-v1` for everything else same-origin GET).
  - `app/js/main.js` (minor edit) — add the `navigator.serviceWorker.register('./sw.js')` call inside `window.addEventListener('load', ...)` with a feature check and a silent `.catch`.
- **Implements spec scenarios:** pwa-install — "Service Worker enables offline use" and "The app opens and works in airplane mode"; local-storage — "No network call is required to use the app" (closes the loop after install).
- **Resolves TBDs:** -
- **Estimated changed lines:** ~75
- **Acceptance criteria:**
  - [x] Open `app/index.html` in Chrome, wait 2 seconds, open DevTools Application > Service Workers: the SW for `app/` shows status **activated and running**.
  - [x] In DevTools Application > Cache Storage, two caches appear: `cg-shell-v1` (the precached shell, 13+ entries) and `cg-runtime-v1` (empty).
  - [x] In DevTools Application > Service Workers, tick "Offline", then reload the page: the dashboard still loads, the totals and list still render.
  - [x] With offline still on, click "Añadir transacción", add a `10,00 €` expense, save: the row appears in the list and the totals update.
  - [x] Untick "Offline", reload once more: the app still works (no stale-cache surprise).
- **Notes:** The manifest is **not** precached on purpose — see `design.md` §6.2. If SW registration silently fails under `file://`, that is expected and the app still works in online mode; the offline scenario is scoped to HTTPS/APK contexts.

## Task 12: Month selector

- **Depends on:** T7
- **Files touched:**
  - `app/js/dashboard.js` (minor edit) — replace the static month label with a 2-button segmented control (`Mes actual` / `Mes anterior`); clicking either button updates the UI state via `saveUiState` and re-renders the view.
- **Implements spec scenarios:** monthly-view — "App opens on the current month", "Switch to the previous month", "Switch back to the current month", "Last viewed month survives a reload".
- **Resolves TBDs:** TBD-4 (selector labels — pick `Mes actual` / `Mes anterior`).
- **Estimated changed lines:** ~25
- **Acceptance criteria:**
  - [x] Open `app/index.html`: the month label shows the current month in Spanish, the `Mes actual` button looks pressed, the list shows current-month transactions.
  - [x] Click `Mes anterior`: the label changes to the previous month, the `Mes anterior` button looks pressed, the list and totals show that month's data (`0,00 €` if it has no movements).
  - [x] Click `Mes actual` again: the view returns to the current month.
  - [x] Add one transaction in the current month, switch to the previous month, switch back: the transaction is still in the current month.
  - [x] Switch to `Mes anterior`, reload with F5: the dashboard still shows the previous month (verifies the persistence in `loadUiState`).
- **Notes:** The selector writes `selectedMonth` to `cg:v1:ui-state` via `saveUiState`. The previous-month ISO is computed as the month before `currentMonthISO()`. If the persisted `selectedMonth` is neither current nor previous (e.g. from a long time ago), `loadUiState` falls back to the current month.

## Task 13: Polish pass

- **Depends on:** T7, T8, T12
- **Files touched:**
  - `app/css/styles.css` (edits) — focus rings on every interactive element, `:active` feedback on buttons, `touch-action: manipulation` on buttons to disable double-tap-to-zoom, mobile viewport sanity (`max-width`, no horizontal scroll), `inputmode="decimal"` on the amount input.
  - `app/js/dashboard.js` (edits) — the totals card always shows all three cells, even when zero (per spec; the "Sin ingresos este mes" / "Sin gastos este mes" sub-copy is added here).
- **Implements spec scenarios:** localization (sub-copy), accessibility (focus rings), and a polish pass on the SC1 empty-state UX.
- **Resolves TBDs:** TBD-2 (empty-state sub-copy — show `Sin ingresos este mes` / `Sin gastos este mes` under the zero cells, in addition to the `0,00 €` figures).
- **Estimated changed lines:** ~20
- **Acceptance criteria:**
  - [x] With no transactions, the totals card shows the three cells with `0,00 €` and the sub-copy `Sin ingresos este mes` / `Sin gastos este mes` / `Sin movimientos`.
  - [x] Tab through the dashboard with the keyboard: every button and link shows a visible focus ring.
  - [x] On a mobile-sized viewport (Chrome DevTools device toolbar, 360 × 640), the app does not scroll horizontally.
  - [x] The Importe input in the add form has `inputmode="decimal"` (verify in DevTools Elements).
- **Notes:** No new dependencies. Keep the CSS changes localized to the selectors that already exist in T1 — do not introduce a new design system.

## Task 14: Local smoke test

- **Depends on:** T9, T10, T11, T12
- **Files touched:** none (manual walkthrough).
- **Implements spec scenarios:** every scenario (this is the full SC1–SC8 verification).
- **Resolves TBDs:** -
- **Estimated changed lines:** 0
- **Acceptance criteria:**
  - [ ] SC1: open `app/index.html` with no data → `0,00 €` everywhere + "Aún no hay movimientos este mes".
  - [ ] SC2: add `25,50 €` Gasto Comida → appears in the list, Gastos shows `25,50 €`.
  - [ ] SC3: switch to `Mes anterior` → list and totals reflect that month (empty by default).
  - [ ] SC4: click delete, confirm → row and totals update.
  - [ ] SC5: F5 reload → transaction is still there.
  - [ ] SC6 (in Chrome on Android): the install prompt appears; installing creates a launcher icon that opens full-screen.
  - [ ] SC7 (after PWABuilder APK install on Android): the APK opens full-screen, transactions are intact.
  - [ ] SC8: enable airplane mode, open the app from the icon → dashboard loads, can add and delete.
  - [ ] Any deviation from the spec is documented in the verify report (not silently fixed here).
- **Notes:** SC6–SC8 require the user to follow the `build-flow.md` checklist between this task and SC7/SC8. The smoke test is the bridge to `sdd-verify`.

## Task 15: Project README

- **Depends on:** T0
- **Files touched:**
  - `control-gastos/README.md` (overwrite the `sdd-init` stub) — project description in Spanish, how to open in Chrome locally, the Netlify + PWABuilder + USB flow with a link to `openspec/changes/mvp-inicial/build-flow.md` for the full checklist, and a "what this MVP does NOT do" list linking to the proposal's out-of-scope section.
- **Implements spec scenarios:** none (documentation only).
- **Resolves TBDs:** -
- **Estimated changed lines:** ~40
- **Acceptance criteria:**
  - [x] `control-gastos/README.md` is written in Spanish, with a one-paragraph description of what the app does.
  - [x] It includes a "Cómo probar en local" section that tells the user to double-click `app/index.html`.
  - [x] It includes a "Generar el APK" section that links to `openspec/changes/mvp-inicial/build-flow.md` for the step-by-step.
  - [x] It includes a "Qué NO hace esta versión" section with the same bullets as `proposal.md` §Out of Scope, in plain Spanish.
- **Notes:** The README is the first thing the user (or anyone) sees on the repo. Keep it short — the deep content lives in `build-flow.md`.

---

## Traceability matrix

| Task | Spec scenarios (id) | SC covered |
|------|---------------------|-----------|
| T0   | (foundation)        | —         |
| T1   | localization (visual baseline) | — |
| T2   | categories ×2       | —         |
| T3   | localization ×2, R-spec-1 | — |
| T4   | local-storage ×3    | SC1, SC5, SC8 (partial) |
| T5   | monthly-totals ×1, transactions ×1 | — |
| T6   | monthly-view (foundation) | —  |
| T7   | transactions ×4, monthly-totals ×2 | SC1, SC2, SC4 |
| T8   | transactions ×2, categories ×1 | SC2 |
| T9   | local-storage ×2, transactions ×1 | SC1, SC2, SC5 |
| T10  | pwa-install ×1      | SC6       |
| T11  | pwa-install ×2, local-storage ×1 | SC7, SC8 |
| T12  | monthly-view ×4     | SC3, SC5  |
| T13  | localization, accessibility | — |
| T14  | every scenario      | SC1–SC8 (verification) |
| T15  | (docs)              | —         |

**Coverage result**: all 8 SCs (SC1–SC8) and all 26 spec scenarios
are implemented by at least one task. No `coverage_gap`.
