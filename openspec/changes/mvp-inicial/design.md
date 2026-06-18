# Design: mvp-inicial (Control de Gastos v0.1)

> Technical design for the v0.1 change. Implements the approved
> `openspec/changes/mvp-inicial/proposal.md` and the 7 capability
> specs under `openspec/changes/mvp-inicial/specs/`. Greenfield
> project; no existing code to integrate with.
>
> **Companion file**: the user-facing APK build checklist lives in
> `openspec/changes/mvp-inicial/build-flow.md` (and is mirrored to
> `app/README-paquete.md` by `sdd-apply`). The summary is in §7.

---

## 1. Architecture Overview

A single-page PWA, vanilla ES modules, no build step, no framework,
no package manager. The entry `app/index.html` loads
`app/js/main.js` (as `<script type="module">`) which hydrates
state from `localStorage`, mounts the hash router, renders the
dashboard, and registers the Service Worker. View switching is
done by toggling visibility of pre-rendered
`<section data-view="…">` elements. The hash router owns the
`#dashboard` and `#add` routes.

**Why a hash router**: under `file://` (the user's local-dev
path), the `history` API silently reloads the document because the
new path doesn't resolve to a real file. Hash changes are
pure client-side in both `file://` and `https://` contexts, survive
F5, and require zero fallback code. Two routes is the right
complexity for an MVP.

```
                       +---------------------+
                       |  app/index.html     |
                       +---------+-----------+
                                 |
                                 v
                       +---------------------+
                       |  app/js/main.js     |
                       |  (boot)             |
                       +---------+-----------+
                                 |
        +------------+-----------+-----------+-------------+
        |            |                       |             |
        v            v                       v             v
  +----------+  +-------------+      +-------------+  +---------+
  | router   |  | storage     |      | transactions|  | sw.js   |
  | (hash)   |  | (localStore)|      |  (CRUD +    |  | (precache
  +----+-----+  +------+------+      |   totals)   |  |  + SWR)
       |               |             +------+------+
       v               v                    |
  +----------+  +-------------+             v
  | views/   |  | money /     |      +-------------+
  | dashboard|  | dates / ids |      | categories  |
  | add-tx   |  +-------------+      | (hardcoded) |
  +----------+                       +-------------+
```

Pattern: **vanilla ES modules, no framework, no build step**.
Strictly aligned with `openspec/config.yaml` (`build: none`,
`frameworks: []`) and with `rules.design` (readable for a
non-developer end-user).

---

## 2. Data Model

All data is plain JSON-serializable. No classes, no proxies, no
Maps. Three logical entities: `Transaction`, `Category` (hardcoded
in code), and `UiState` (persisted view selection).

### 2.1 `Transaction` (persisted)

| Field         | Type     | Required | Default | Notes                                                                                              |
|---------------|----------|----------|---------|----------------------------------------------------------------------------------------------------|
| `id`          | string   | yes      | gen     | UUID v4 from `crypto.randomUUID()` (with a tiny inline fallback for ancient browsers; see `ids.js`). |
| `type`        | enum     | yes      | —       | `"gasto"` or `"ingreso"`. Stored as the Spanish string the user sees.                              |
| `amountCents` | integer  | yes      | —       | Always **> 0**. Form accepts `25,50` → stored as `2550`. Never floats.                             |
| `description` | string   | yes      | —       | Free text, trimmed, 1–200 chars after trim.                                                        |
| `date`        | string   | yes      | —       | **ISO 8601 `YYYY-MM-DD`** (canonical). Display converts to `dd/MM/yyyy`. **Closes R-spec-1.**       |
| `categoryId`  | string   | yes      | —       | Must match one of the 8 hardcoded IDs (§2.2).                                                       |
| `createdAt`   | string   | yes      | set     | ISO 8601 with time. Tiebreaker for sort: same date → most recent `createdAt` first.                |
| `updatedAt`   | string   | yes      | set     | Same format. Always equal to `createdAt` in v0.1 (no edit flow), but the field exists so a future edit change does not need a schema migration. |

### 2.2 `Category` (hardcoded in code, NOT persisted)

Eight categories, exported as a frozen `const` from
`app/js/categories.js`. **Not** written to `localStorage` (per
proposal §Impact: "las categorías por defecto viven en el código,
no se persisten").

| `id`               | `name`       | `type`     |
|--------------------|--------------|------------|
| `cat-comida`       | `Comida`     | `gasto`    |
| `cat-transporte`   | `Transporte` | `gasto`    |
| `cat-ocio`         | `Ocio`       | `gasto`    |
| `cat-compras`      | `Compras`    | `gasto`    |
| `cat-alquiler`     | `Alquiler`   | `gasto`    |
| `cat-ahorro`       | `Ahorro`     | `gasto`    |
| `cat-sueldo`       | `Sueldo`     | `ingreso`  |
| `cat-otros`        | `Otros`      | `ambos`    |

The add form filters this list by the picked `type` (`Sueldo`
hidden when `gasto`; the `gasto`-only six hidden when `ingreso`;
`Otros` always visible). Each row also carries a short text tag
(`COM`, `BUS`, `OC`, `CPR`, `ALQ`, `AHO`, `SUE`, `+`) used as a
compact visual cue in the transaction list. A `color` field exists
for a future change; it is always `null` in v0.1 — the row accent
is driven by `type` only.

### 2.3 `UiState` (persisted)

| Field           | Type   | Required | Default       | Notes                                                                                            |
|-----------------|--------|----------|---------------|--------------------------------------------------------------------------------------------------|
| `selectedMonth` | string | yes      | current month | ISO 8601 month `YYYY-MM`. On read: if unparseable or not the current/previous month, fall back to current. Closes `monthly-view` "Last viewed month survives a reload". |

### 2.4 Formatting contracts (single point of conversion)

- **Money**: stored as `amountCents: integer`; `formatEUR(cents)`
  returns `"25,50 €"` (two decimals, comma decimal, single space,
  no thousands separator). `parseEURInput("25,50"): 2550` accepts
  both `,` and `.`, rejects empty/non-numeric/non-positive. The
  validation error renders in Spanish as
  `"El importe debe ser mayor que cero"`.
- **Dates**: stored as `"YYYY-MM-DD"`;
  `formatDateShort(iso): "25/06/2026"`.
  `parseDateInput("25/06/2026"): "2026-06-25"` rejects malformed
  strings and impossible dates.

---

## 3. Persistence Layer (localStorage)

### 3.1 Key namespace

All keys live under the versioned prefix `cg:v1:`. The version is
bumped manually when the schema changes; old keys are dropped on
hydration and the user starts fresh. Acceptable for v0.1
(single-user, single-device).

### 3.2 Keys

| Key                  | Shape                                | Default if missing                                       |
|----------------------|--------------------------------------|----------------------------------------------------------|
| `cg:v1:transactions` | `Transaction[]` (see §2.1)           | `[]`                                                     |
| `cg:v1:ui-state`     | `{ selectedMonth: "YYYY-MM" }`       | `{ selectedMonth: currentMonthISO() }`                   |

Note: there is **no** `cg:v1:categories` key. Categories are
hardcoded in code per proposal §Impact.

### 3.3 Read/Write API surface

| Function                                  | Responsibility                                                                                            |
|-------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `storage.loadTransactions(): Transaction[]` | Read + validate `cg:v1:transactions`; on missing/corrupt, return `[]` and reset the key.             |
| `storage.saveTransactions(list): void`    | Write the full `Transaction[]` to `cg:v1:transactions` (single-key rewrite; v0.1 has no batching).        |
| `storage.loadUiState(): UiState`          | Read + validate `cg:v1:ui-state`; on missing/corrupt, return the default and reset the key.               |
| `storage.saveUiState(state): void`        | Write the `UiState` object to `cg:v1:ui-state`.                                                            |

**Validation rule** (both keys): on read, try `JSON.parse`; if it
throws or the parsed value does not match the expected shape, log a
single-line `console.warn` and reset the key to the default. The
app continues with default data — we accept the data loss for v0.1
(no IndexedDB migration; that is a future change).

### 3.4 Hydration on app start

`main.js` calls `storage.loadTransactions()` and
`storage.loadUiState()` before the first render. Both are
synchronous; the cost is sub-millisecond; no separate loading
screen is needed.

---

## 4. UI/UX Decisions

### 4.1 Screens

- **Dashboard** (route `#dashboard`): single scrollable column. Header
  with app title + month selector on the right. 3-cell totals card
  (Ingresos, Gastos, Neto); the Neto cell is the visual emphasis
  (positive = `--income` accent, negative = `--expense` accent).
  Below it the transaction list, sorted by date desc then
  `createdAt` desc. An empty-state `<p>` is shown when the list is
  empty for the selected month. The month selector is a
  two-button segmented control (`Mes actual` / `Mes anterior`) with
  the active button visually pressed. The current month label
  renders as `Mayúsculas mes YYYY` (e.g. `Junio 2026`).
- **Add Transaction** (route `#add`): header with "← Atrás" link
  (back to `#dashboard`). Form: `Tipo` (radio: Gasto / Ingreso),
  `Importe (€)` (text input, accepts `,` or `.`), `Fecha`
  (text input pre-filled with today in `dd/MM/yyyy`), `Categoría`
  (`<select>` filtered by the picked type per §2.2), `Descripción`
  (text input). Save button at the bottom. On success, the new
  transaction is written to `cg:v1:transactions` and the user
  navigates back to `#dashboard`; the dashboard re-renders
  immediately. On validation failure, an inline Spanish error is
  shown and nothing is saved.
- **Delete confirm**: native `window.confirm()` with Spanish copy
  (see §9 for the exact wording choice). Native confirm is
  acceptable here: it works under `file://`, requires no
  accessibility plumbing (focus trap handled by the browser), and
  satisfies the spec's "confirmation prompt" requirement. A custom
  modal can be added in a future change if the user wants a
  themed dialog.

### 4.2 Navigation state machine

```
        +-----------------+
        |   #dashboard    | <----------------------+
        +--------+--------+                        |
                 | tap "Añadir"                    |
                 v                                 |
        +-----------------+   tap "Atrás" / save   |
        |     #add        | --------------------->+
        +-----------------+
```

The router holds `{ route, month }`, owned by `main.js`; views are
pure functions of state + the storage slice they need. No external
state library.

### 4.3 Visual design tokens (CSS custom properties on `:root`)

A calm, modern-banking-app palette. Defined once in
`app/styles.css`, used everywhere. No framework.

| Token                       | Value                  | Purpose                                  |
|-----------------------------|------------------------|------------------------------------------|
| `--bg` / `--surface`        | `#F7F8FA` / `#FFFFFF`  | App background / cards.                  |
| `--text` / `--text-muted`   | `#1A1F2B` / `#6B7280`  | Primary / helper text.                   |
| `--border`                  | `#E5E7EB`              | Subtle separators.                       |
| `--accent`                  | `#2F6FED`              | Brand (primary buttons, focus ring).     |
| `--income` / `--expense`    | `#1F8F61` / `#C73E3A`  | Positive / negative amount accent.       |
| `--radius-sm` / `--radius-md` | `6px` / `12px`      | Inputs / cards.                          |
| `--space-1..4`              | `4/8/16/24px`          | Spacing scale.                           |
| `--font-size-sm/base/lg/xl` | `13/16/20/28px`        | Helper / body / totals / title.          |

Contrast: `--text` on `--bg` ≥ 12:1, `--text-muted` on `--surface`
≥ 4.5:1 (verified against the palette; no external tool needed for
a 14-token set).

### 4.4 Typography, empty states, confirmations, accessibility

- **Typography**: system font stack — no web fonts, satisfies
  offline:
  `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;`
  The OS stack covers `ñ`, accented characters, and `€` on every
  platform we care about.
- **Empty states**: dashboard with no transactions shows
  `Aún no hay movimientos este mes` (verbatim from the
  `transactions` and `monthly-totals` specs). The totals row still
  renders `0,00 €` for income, expenses, and net. A separate
  "history list" view does not exist in v0.1.
- **Confirmations**: delete always asks (per spec, per
  banking-app convention). Add never asks — the form is the gate.
- **Accessibility**: semantic HTML (`<header>`, `<main>`, `<nav>`,
  `<form>`, `<button>`, `<label for>`, input `type` matched to the
  field). Every input has a visible `<label>`. Focus is moved to
  the first input when the add view mounts and returned to the
  totals card on unmount (manual `focus()` after
  `requestAnimationFrame`). Native `confirm()` handles focus trap
  and screen reader announcement for the delete dialog.

---

## 5. Module Structure

Target: ~12 files in `app/` + 1 tool + 1 user-facing doc. Plain ES
modules loaded with `<script type="module">`. No bundler, no
transpilation.

```
app/
├── index.html                 # Entry: viewport, manifest link, mounts main.js
├── manifest.webmanifest       # PWA manifest (§6.1)
├── styles.css                 # Design tokens + all component styles
├── sw.js                      # Service Worker (§6.2)
├── icons/
│   ├── icon-192.png           # Generated once by tools/generate-icons.html
│   └── icon-512.png           # Generated once by tools/generate-icons.html
├── js/
│   ├── main.js                # Boot: hydrate, mount router, render, register SW
│   ├── router.js              # Hash router: { route, month } state, onChange
│   ├── storage.js             # load/save Transactions and UiState with validation
│   ├── transactions.js        # add/delete, listForMonth, computeTotals
│   ├── categories.js          # Hardcoded 8 categories (exported const)
│   ├── money.js               # formatEUR, parseEURInput
│   ├── dates.js               # formatDateShort, parseDateInput, currentMonthISO, monthLabel
│   ├── ids.js                 # uuid() — crypto.randomUUID() + inline fallback
│   ├── dashboard.js           # Render dashboard view (totals + list + month selector)
│   └── add-transaction.js     # Render add form + validation + save
└── README-paquete.md          # Spanish user-facing APK checklist (mirror of build-flow.md)

tools/
└── generate-icons.html        # One-shot SVG→PNG helper (sdd-apply runs it once)
```

### 5.1 Per-file contracts

| File                    | Role                                                                                          |
|-------------------------|-----------------------------------------------------------------------------------------------|
| `js/main.js`            | Entry. Hydrate, mount router, render initial view, register `sw.js` on `load`.                |
| `js/router.js`          | `initRouter(onChange)`. Wires `hashchange` + initial `location.hash`; calls `onChange({route, month})`. |
| `js/storage.js`         | `loadTransactions`, `saveTransactions`, `loadUiState`, `saveUiState`. Owns all `localStorage` I/O with validation + reset-to-default. |
| `js/transactions.js`    | `addTransaction`, `deleteTransaction`, `listForMonth`, `computeTotals`. Pure functions over the in-memory list; `addTransaction` writes through `storage`. |
| `js/categories.js`      | Exports `CATEGORIES` (frozen `const`, 8 entries from §2.2).                                    |
| `js/money.js`           | `formatEUR`, `parseEURInput`. Cents ↔ Spanish `€` formatting.                                 |
| `js/dates.js`           | `formatDateShort`, `parseDateInput`, `currentMonthISO`, `monthLabel`. ISO ↔ `dd/MM/yyyy`, month math, Spanish labels. |
| `js/ids.js`             | `uuid()`. `crypto.randomUUID()` + tiny RFC-4122 v4 inline fallback.                            |
| `js/dashboard.js`       | `renderDashboard(root, state)`. Mounts dashboard; wires month selector, delete buttons, "Añadir". |
| `js/add-transaction.js` | `renderAddTransaction(root, state)`. Mounts form; validates; on save calls `addTransaction` and navigates back. |

### 5.2 Entry point

`app/index.html` includes:

```html
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#2F6FED">
<script type="module" src="js/main.js"></script>
```

`main.js` is the only `<script>` tag; everything else is imported.

---

## 6. PWA Configuration

### 6.1 Web App Manifest (`app/manifest.webmanifest`)

| Field             | Value                                                                                                                          |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------|
| `name`            | `Control de gastos`                                                                                                            |
| `short_name`      | `Gastos`                                                                                                                       |
| `start_url`       | `./`                                                                                                                           |
| `scope`           | `./`                                                                                                                           |
| `display`         | `standalone`                                                                                                                   |
| `orientation`     | `portrait`                                                                                                                     |
| `background_color`| `#F7F8FA` (matches `--bg`)                                                                                                     |
| `theme_color`     | `#2F6FED` (matches `--accent`)                                                                                                 |
| `lang`            | `es-ES`                                                                                                                        |
| `dir`             | `ltr`                                                                                                                          |
| `icons`           | `[{ src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }]` |

Icon design (concept, not pixels): a rounded-square tile in
`--accent` blue with a white "€" centered inside. `sdd-apply` will
render an inline SVG inside `tools/generate-icons.html` to
`192×192` and `512×512` PNGs via the Canvas API, then commit them
under `app/icons/`. The maskable variant is achieved by keeping
the "€" inside the central safe zone (60% of the icon area), per
the maskable-icon spec.

### 6.2 Service Worker (`app/sw.js`) — closes **R-spec-2**

**Cache strategy: app-shell precache on `install` +
stale-while-revalidate (SWR) for all same-origin GET requests on
`fetch`.**

#### Why this closes R-spec-2

- `pwa-install` SC8 (offline after first install) is satisfied
  because the entire app shell is in the SW cache after the first
  successful load. PWABuilder's APK wraps the PWA in a WebView that
  reuses the registered SW; the cache survives the wrap.
- PWABuilder may rewrite or append query strings to internal
  URLs. The runtime SWR handler falls back to the cached response
  when the network returns non-2xx for the same path, which keeps
  the app working through minor URL drift.
- The manifest itself is NOT precached (the browser fetches it
  fresh; we want the latest theme/start_url). It is also not
  intercepted by the SW's `fetch` handler (see filter below).

#### Cache name + version bump rule

- Cache name: `cg-shell-v1`. The literal `v1` is the schema
  version of the precached shell.
- Bump rule: any change to a file in the precache list bumps
  `v1` → `v2`. The `activate` handler deletes any cache whose
  name does not start with the current `cg-shell-v`.
- Manual bump — no automation in v0.1 (no build step).

#### Precached app shell (the exact set)

```
./                          (resolves to index.html)
./index.html
./styles.css
./js/main.js
./js/router.js
./js/storage.js
./js/transactions.js
./js/categories.js
./js/money.js
./js/dates.js
./js/ids.js
./js/dashboard.js
./js/add-transaction.js
./icons/icon-192.png
./icons/icon-512.png
```

Note: `./manifest.webmanifest` is referenced by the HTML
`<link rel="manifest">` and by the icons array, but the SW
deliberately excludes it from the precache and lets the browser
fetch it fresh. This avoids serving a stale manifest after a
deploy that changes icons or theme color.

#### `fetch` handler (high-level logic)

```
on fetch(request):
  if request.method != "GET":              -> network only (no cache)
  if request URL is not same-origin:       -> network only (no cross-origin calls exist)
  if request URL ends with "manifest.webmanifest": -> network only (always fresh)
  else:                                    -> stale-while-revalidate from "cg-runtime-v1"
                                              (fallback: return cached shell entry by path)
```

The runtime cache `cg-runtime-v1` exists for future-proofing
(SWR has something to SWR against). In v0.1 it is effectively a
no-op because every same-origin GET is already in the precache.
We do not delete it on `activate` because the SWR contract may be
used in a future change.

#### `install` / `activate` handlers

`install`: precache the app shell list above + `self.skipWaiting()`
(avoids the "close all tabs" UX). `activate`: delete all caches
whose name does NOT start with `cg-shell-v1` or `cg-runtime-v1`,
then `self.clients.claim()` so the very first page load after
install is controlled by the new SW (no second reload needed).

### 6.3 Registration

`app/js/main.js` registers the SW on `window.load`, with a feature
check + a silent `catch` (if registration fails, e.g. under
`file://` where SW is unavailable, the app still works in online
mode; the spec's offline scenarios are scoped to HTTPS/APK
contexts).

---

## 7. APK Build Flow (summary)

The full step-by-step checklist for a non-developer lives in the
companion file **`build-flow.md`** (sibling of this `design.md`).
It covers:

1. **Probar en local** — open `app/index.html` in Chrome; walk
   through the 6 manual checks (empty state, add 25,50 €, F5
   reload survives, delete confirms, etc.).
2. **Subir a Netlify Drop** — drag the `app/` folder to
   <https://app.netlify.com/drop>, copy the resulting
   `https://*.netlify.app` URL.
3. **Generar el APK con PWABuilder** — paste the URL into
   <https://www.pwabuilder.com/reportcard>, click
   **Package For Stores → Android → Generate**, download the
   `.apk`.
4. **Pasar el APK al móvil e instalar** — USB in MTP mode, copy
   the `.apk` to the phone's internal storage, open it from
   **Archivos**, enable **Instalar apps de orígenes
   desconocidos** for **Archivos** at
   *Ajustes → Apps → Acceso especial → Instalar apps
   desconocidas*, install, open, test in airplane mode.
5. **Limpieza opcional** — delete the Netlify deployment at
   <https://app.netlify.com/>; the APK keeps working.

`app/README-paquete.md` (created by `sdd-apply`) mirrors the
content of `build-flow.md` for the user. Plain Spanish, no jargon,
numbered checklist format.

---

## 8. Risk Closures

| Risk ID  | Description (from sdd-spec)                              | Closed by                                                                                                                                              | Status   |
|----------|----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| R-spec-1 | Internal date representation ambiguous                   | §2.1 (`date` field), §2.4 (formatting contract) — canonical ISO `YYYY-MM-DD` stored; `dd/MM/yyyy` for display only. `parseDateInput` is the single point of conversion. | **closed** |
| R-spec-2 | Service Worker + APK offline (PWABuilder regenerates URLs) | §6.2 — app-shell precache on `install` + SWR for same-origin GETs. The shell is fully cached after first load; PWABuilder's WebView retains the SW registration and cache. The manifest is intentionally NOT precached to avoid stale UI. | **closed** |

The two sdd-spec risks that are scope-restriction docs (out-of-scope
items restated as risks for traceability) are not blockers for v0.1
and remain in the proposal.

---

## 9. Open Items for the Tasks Phase

- **TBD during tasks — exact icon color values**: the manifest
  uses `#2F6FED` and `#F7F8FA` per §4.3/§6.1, but the SVG inside
  `tools/generate-icons.html` may use slightly different shades
  for the white "€" stroke (anti-aliasing tuning). `sdd-tasks`
  should leave the actual SVG markup to `sdd-apply` and not
  over-specify.
- **TBD during tasks — empty-state copy**: the spec already fixes
  the copy (`"Aún no hay movimientos este mes"`) so this is for
  the labels around it (e.g. the totals card when income is 0 —
  "Sin ingresos este mes" or just `0,00 €`). Both are
  acceptable; the spec doesn't pin them down.
- **TBD during tasks — dialog copy**: `window.confirm` takes a
  single string. Current draft: `¿Borrar este movimiento?`.
  `sdd-tasks` may want to include amount + description in the
  prompt (e.g. `¿Borrar "Supermercado" de 25,50 €?`) for
  clarity. Both are acceptable; the spec doesn't pin the exact
  wording.
- **TBD during tasks — month selector labels**: the spec says
  "current and previous month" but doesn't fix the label text.
  Candidates: `Mes actual` / `Mes anterior` (chosen), or `Este
  mes` / `Mes pasado`. `sdd-tasks` should pick one and stick
  with it.
- **TBD during tasks — category filter in the add form**: when
  the user picks `Gasto`, should `Sueldo` be hidden from the
  dropdown? §2.2 says yes (filter by `type`). `sdd-tasks` should
  codify this as a task and `sdd-apply` should implement it; if
  it ends up too fiddly, the fallback is to show all 8 and let
  the user pick. Flagged in §2.2 already, so no surprise.

**Spec→design gaps**: None. Every scenario in the 7 capability
specs is implementable with the design above using vanilla
HTML/CSS/JS + `localStorage`. The orchestrator's prompt mentioned
a "history list" empty state, but no spec defines a history list
view; we treat the dashboard list as the only list view (noted in
§4.5).
