# Local Storage Specification

## Purpose

Define how the user's data persists on the device. All transactions are stored locally; there is no server, no account, and no sync. Persistence uses the browser's local storage and survives reloads, tab closes, browser restarts, and mobile reboots as long as the user does not clear site data or uninstall the app.

## Requirements

### Requirement: Persist all transactions locally

The system MUST save every add and every confirmed delete to local storage so that the data is available after a reload. The system MUST load the stored transactions on app start and display them in the list of the matching month.

#### Scenario: Transactions survive a tab reload (covers SC5)

- GIVEN the user has added at least one transaction in the current month
- WHEN the user reloads the tab with F5
- THEN the transaction is still listed in the current month
- AND the totals are unchanged

#### Scenario: First run with no stored data shows the empty state (covers SC1)

- GIVEN the user opens the app for the first time on a device with no stored data
- WHEN the dashboard loads
- THEN incomes, expenses, and net show `0,00 €`
- AND the list area shows "Aún no hay movimientos este mes" in Spanish

### Requirement: Storage is local-only

The system MUST NOT send any transaction data to a remote server, a third-party API, or a cloud service. All persistence MUST stay on the device. After the first successful load, the app MUST remain fully usable without network connectivity.

#### Scenario: No network call is required to use the app (covers SC8)

- GIVEN the app has been opened at least once on the device
- WHEN the user enables airplane mode and reopens the app
- THEN the saved transactions are still listed
- AND the user can add, list, and delete transactions against the locally stored data
