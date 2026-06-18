# Monthly View Specification

## Purpose

Define how the user selects which month the dashboard and the transaction list display. In v0.1 the selector offers exactly two values: the current month and the immediately previous month.

## Requirements

### Requirement: Default to the current month

When the app starts with no remembered selection, the system MUST select the current calendar month (system clock) as the viewed month.

#### Scenario: App opens on the current month (covers SC1)

- GIVEN the system clock is in the current month
- WHEN the user opens the app
- THEN the dashboard labels the current month as the selected month
- AND the list and totals show the current month

### Requirement: Navigate between the current and the previous month

The system MUST provide a control to switch the viewed month between the current month and the immediately previous month. Switching MUST update the list and the totals to that month immediately.

#### Scenario: Switch to the previous month (covers SC3)

- GIVEN the dashboard is showing the current month
- WHEN the user selects the previous month
- THEN the list shows only the transactions whose date falls in that previous month
- AND the totals reflect that previous month (`0,00 €` if it has no movements)

#### Scenario: Switch back to the current month (covers SC3)

- GIVEN the dashboard is showing the previous month
- WHEN the user selects the current month
- THEN the list and totals return to the current month

### Requirement: Persist the last viewed month

The system MUST remember the last month the user viewed across reloads and app restarts. If the remembered selection is no longer reachable (only current and previous are offered), the system MUST fall back to the current month.

#### Scenario: Last viewed month survives a reload

- GIVEN the user has selected the previous month
- WHEN the user reloads the tab with F5
- THEN the dashboard still shows the previous month
