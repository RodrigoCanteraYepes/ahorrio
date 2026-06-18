# Specs Traceability — mvp-inicial

This file maps every scenario in `openspec/changes/mvp-inicial/specs/` to the
Success Criterion (SC) it covers from `proposal.md`. Each scenario cites its
SC reference inline in the scenario name (e.g. `(covers SC2)`); this file
is the full audit trail that the orchestrator reads to confirm coverage.

## transactions — 6 scenarios

| Scenario | Covers |
| --- | --- |
| Add an expense and see it in the list | SC2 |
| Reject a transaction with non-positive amount | SC2 (validation) |
| Current-month list is sorted by date descending | SC2 |
| Empty month shows the empty-state message | SC1 |
| Confirmed delete removes the transaction | SC4 |
| Cancelled confirmation keeps the transaction | SC4 |

## categories — 2 scenarios

| Scenario | Covers |
| --- | --- |
| The eight default categories appear in the add form | proposal scope (catalog) |
| No category editor is reachable from the UI | proposal scope (no editor) |

## monthly-view — 4 scenarios

| Scenario | Covers |
| --- | --- |
| App opens on the current month | SC1 |
| Switch to the previous month | SC3 |
| Switch back to the current month | SC3 |
| Last viewed month survives a reload | proposal scope (persistence of selection) |

## monthly-totals — 5 scenarios

| Scenario | Covers |
| --- | --- |
| Empty month shows zero totals and the empty-state message | SC1 |
| Adding an expense updates the totals | SC2 |
| Adding an income updates the net correctly | proposal scope (type x totals) |
| Deleting a transaction recalculates the totals | SC4 |
| Totals are per-month, not global | SC3 |

## local-storage — 3 scenarios

| Scenario | Covers |
| --- | --- |
| Transactions survive a tab reload | SC5 |
| First run with no stored data shows the empty state | SC1 |
| No network call is required to use the app | SC8 |

## pwa-install — 3 scenarios

| Scenario | Covers |
| --- | --- |
| Install from Chrome on Android shows a full-screen icon | SC6 |
| The app opens and works in airplane mode | SC8 |
| APK installs and launches full-screen on Android | SC7 |

## localization — 3 scenarios

| Scenario | Covers |
| --- | --- |
| All visible labels are in Spanish | proposal scope (es-ES UI) |
| Transaction dates render in dd/MM/yyyy | proposal scope (date format) |
| Amounts display with comma decimal and euro symbol | proposal scope (currency) |

## Success Criteria coverage matrix

| SC | Covered by |
| --- | --- |
| SC1 | transactions (empty), monthly-totals (empty), monthly-view (default), local-storage (first run) |
| SC2 | transactions (add, list), monthly-totals (add) |
| SC3 | monthly-view (nav x2), monthly-totals (per-month) |
| SC4 | transactions (delete, cancel), monthly-totals (delete) |
| SC5 | local-storage (F5 reload) |
| SC6 | pwa-install (Chrome install) |
| SC7 | pwa-install (APK) |
| SC8 | pwa-install (airplane), local-storage (no network) |

**Coverage result**: all 8 Success Criteria from the proposal are covered
by at least one scenario.

## Design Coverage

Mapping each capability spec to the design sections that implement it.
The full design is at `openspec/changes/mvp-inicial/design.md`; the
APK build checklist the user follows is at
`openspec/changes/mvp-inicial/build-flow.md`.

| Capability spec     | Design sections                                            | Notes                                                                                       |
|---------------------|------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| `transactions`      | §2.1 (data), §2.4 (money/date contracts), §3 (persistence), §4.1 (Dashboard + Add + Delete confirm), §5 (`transactions.js`, `add-transaction.js`, `dashboard.js`), §9 (dialog copy TBD) | Delete uses native `window.confirm`; the form re-renders the dashboard on save. |
| `categories`        | §2.2 (hardcoded 8), §5 (`categories.js`)                   | No `cg:v1:categories` key — categories live in code per proposal §Impact.                  |
| `monthly-view`      | §2.3 (UiState), §3.2 (key), §4.1 (Dashboard month selector) | Selector is a 2-button segmented control; `selectedMonth` falls back to current if unparseable or not in {current, prev}. |
| `monthly-totals`    | §2.4 (formatting), §4.1 (Dashboard totals card), §5 (`computeTotals` in `transactions.js`) | 3-cell card; positive/negative accent from `--income`/`--expense`. |
| `local-storage`     | §3 (entire persistence layer), §5 (`storage.js`)          | Two keys only (`cg:v1:transactions`, `cg:v1:ui-state`); reset-to-default on validation failure. |
| `pwa-install`       | §6.1 (manifest), §6.2 (service worker), §6.3 (registration), §7 + `build-flow.md` (APK steps) | SW is app-shell precache + SWR (closes R-spec-2); manifest excludes the SW to avoid staleness. |
| `localization`      | §2.4 (money/date contracts), §4.1 (form input accepts `,`), §4.4 (system font) | All UI strings in es-ES; ISO `YYYY-MM-DD` stored, `dd/MM/yyyy` displayed (closes R-spec-1). |
