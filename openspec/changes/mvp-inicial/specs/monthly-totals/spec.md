# Monthly Totals Specification

## Purpose

Define the totals the dashboard shows for the currently viewed month: income, expenses, and net (income minus expenses). The totals must react immediately to add and delete in the viewed month.

## Requirements

### Requirement: Compute income, expenses, and net for the viewed month

The system MUST display three totals for the currently selected month: the sum of incomes, the sum of expenses, and the net (income minus expenses). Totals MUST be displayed in euros with the comma as decimal separator (e.g. `25,50 €`). The system MUST update the totals immediately after any add or delete in the viewed month.

#### Scenario: Empty month shows zero totals and the empty-state message (covers SC1)

- GIVEN the selected month has no transactions
- WHEN the user opens the dashboard
- THEN incomes, expenses, and net all show `0,00 €`
- AND the list area shows "Aún no hay movimientos este mes" in Spanish

#### Scenario: Adding an expense updates the totals (covers SC2)

- GIVEN the current month shows zero totals
- WHEN the user adds a `25,50 €` expense
- THEN expenses show `25,50 €`, incomes show `0,00 €`, and net shows `-25,50 €`

#### Scenario: Adding an income updates the net correctly

- GIVEN the current month has a `25,50 €` expense
- WHEN the user adds a `100,00 €` income
- THEN expenses show `25,50 €`, incomes show `100,00 €`, and net shows `74,50 €`

#### Scenario: Deleting a transaction recalculates the totals (covers SC4)

- GIVEN the current month has a `25,50 €` expense
- WHEN the user confirms the deletion of that expense
- THEN expenses return to `0,00 €`, incomes remain `0,00 €`, and net returns to `0,00 €`

#### Scenario: Totals are per-month, not global (covers SC3)

- GIVEN the previous month has transactions and the current month is empty
- WHEN the user switches to the previous month
- THEN the totals reflect only the previous month
- AND when the user switches back to the current month, the totals are `0,00 €`
