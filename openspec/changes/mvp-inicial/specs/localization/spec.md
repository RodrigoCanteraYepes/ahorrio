# Localization Specification

## Purpose

Define the language, date, and currency conventions of the user interface. The app is Spanish-only in v0.1 and follows Spanish conventions for dates, decimals, and currency.

## Requirements

### Requirement: Spanish-only user interface

All user-visible labels, buttons, messages, and error texts MUST be in Spanish (es-ES). The system MUST NOT expose any English-only string to the user.

#### Scenario: All visible labels are in Spanish

- GIVEN the user opens the app
- WHEN the user reads any label, button, message, or error text on screen
- THEN the text is in Spanish
- AND no English-only label is shown

### Requirement: Dates formatted as dd/MM/yyyy

Every date the system displays (transaction dates, current month label) MUST be formatted as `dd/MM/yyyy`. The system MUST accept dates entered in the same format.

#### Scenario: Transaction dates render in dd/MM/yyyy

- GIVEN a transaction dated the 3rd of a month
- WHEN the user views that transaction in the list
- THEN the date is shown with a zero-padded day and zero-padded month (e.g. `03/MM/yyyy`)

### Requirement: Currency in euros with comma decimal separator

Every monetary amount the system displays or accepts MUST use the comma as the decimal separator and the euro symbol `€` as the currency marker. The system MUST accept amounts entered with a comma and MUST display amounts with two decimals.

#### Scenario: Amounts display with comma decimal and euro symbol

- GIVEN a transaction of twenty-five euros and fifty cents
- WHEN the user views the amount in the list and in the totals
- THEN the amount is shown as `25,50 €` in both places
