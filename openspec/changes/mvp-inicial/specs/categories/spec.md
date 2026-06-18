# Categories Specification

## Purpose

Define the fixed set of categories the user can attach to a transaction. Categories are read-only in v0.1: the user cannot create, rename, or delete them from the UI.

## Requirements

### Requirement: Default categories are always available

The system MUST provide exactly these eight default categories, available in every add-transaction form: `Comida`, `Transporte`, `Ocio`, `Compras`, `Alquiler`, `Ahorro`, `Sueldo`, `Otros`. The system MUST NOT add, remove, rename, or reorder these categories from the UI.

#### Scenario: The eight default categories appear in the add form

- GIVEN the user opens the add-transaction form
- WHEN the category selector is displayed
- THEN the user can pick any of `Comida`, `Transporte`, `Ocio`, `Compras`, `Alquiler`, `Ahorro`, `Sueldo`, `Otros`
- AND no other category is offered

### Requirement: Categories are read-only in the UI

The system MUST NOT expose any control that creates, renames, or deletes a category. The set of categories is defined in the app and cannot be changed by the user.

#### Scenario: No category editor is reachable from the UI

- GIVEN the user is on any screen of the app
- WHEN the user looks for a way to add, rename, or delete a category
- THEN the app MUST NOT offer any control that performs those actions
