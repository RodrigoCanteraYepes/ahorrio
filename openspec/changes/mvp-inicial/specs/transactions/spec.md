# Transactions Specification

## Purpose

Define how the user records, lists, and removes individual income and expense entries. The dashboard and the monthly totals summarize the data defined here.

## Requirements

### Requirement: Add a transaction

The system MUST let the user add a new transaction with the following fields: type (`gasto` or `ingreso`), amount, description, date, and category. The system MUST reject a transaction whose amount is zero or negative and MUST display a visible Spanish error message naming the invalid field. The system MUST require `type`, `amount`, and `date` to be present. After a successful add, the new transaction MUST appear immediately in the list of the matching month.

#### Scenario: Add an expense and see it in the list (covers SC2)

- GIVEN the current month has no movements
- WHEN the user taps "Añadir transacción", selects "Gasto", enters `25,50` €, description `Supermercado`, a date in the current month, category `Comida`, and confirms
- THEN the new transaction appears in the list of the current month
- AND the dashboard totals update without a manual reload

#### Scenario: Reject a transaction with non-positive amount

- GIVEN the add-transaction form is open
- WHEN the user enters `0` or a negative amount and confirms
- THEN the system does not save the transaction
- AND a visible message in Spanish says that the amount must be greater than zero

### Requirement: List transactions of the selected month

The system MUST show only the transactions whose date falls within the currently selected month, ordered by date descending (most recent first) and by creation order for ties. Each row MUST display the date in `dd/MM/yyyy`, the description, the category name, the signed amount in euros with comma decimal separator, and a delete control.

#### Scenario: Current-month list is sorted by date descending (covers SC2)

- GIVEN the current month has two transactions, one on the 15th and one on the 3rd
- WHEN the user opens the dashboard
- THEN the transaction dated the 15th appears above the transaction dated the 3rd
- AND each row shows the date in `dd/MM/yyyy`, the description, the category, and the amount in euros

#### Scenario: Empty month shows the empty-state message (covers SC1)

- GIVEN the selected month has no transactions
- WHEN the user opens the dashboard
- THEN the list area shows the message "Aún no hay movimientos este mes" in Spanish

### Requirement: Delete a transaction

The system MUST require explicit confirmation before deleting a transaction. After confirmation, the transaction MUST disappear from the list, the totals MUST update immediately, and the change MUST persist. If the user cancels the confirmation, the transaction MUST remain unchanged.

#### Scenario: Confirmed delete removes the transaction (covers SC4)

- GIVEN the current month shows a `25,50 €` transaction
- WHEN the user taps its delete control and confirms in the confirmation prompt
- THEN the transaction disappears from the list
- AND the dashboard totals reflect the removal without a manual reload

#### Scenario: Cancelled confirmation keeps the transaction (covers SC4)

- GIVEN the current month shows a `25,50 €` transaction
- WHEN the user taps its delete control and cancels the confirmation prompt
- THEN the transaction remains in the list
- AND the totals stay unchanged
