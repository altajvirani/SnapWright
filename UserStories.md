# User Stories

- **Prevent nesting of Page Factories**  
  _As a developer_, I should not be allowed to add a page factory inside another page factory, _so that_ the system maintains valid architectural boundaries.

- **Prevent circular usage of POM instance from Page Factory**  
  _As a developer_, I should not be allowed to use an instance of a POM from a page factory inside the same POM itself, _so that_ circular references are avoided and architectural integrity is maintained.

- **Correct and dynamic imports in POM creation**  
  _As a developer_, when I generate a POM, the page factory imports should be dynamically resolved and accurately inserted, _so that_ I avoid manual corrections and ensure correct linkage.

- **Save and display page factory paths**  
  _As a user_, I want the page factory path to be saved during creation and appear in a list of saved paths, _so that_ I can easily associate a POM with the correct page factory.

- **Assign label to Page Factory during creation**  
  _As a user_, I want to assign a label to a page factory when it’s being created, with the default label matching the name of the factory but allowing me to override it, _so that_ I can give it a more readable or functional identity where needed.

- **Select and import global pages from a chosen page factory**  
  _As a user_, I want to select a specific page factory and automatically import its global page, _so that_ I can leverage shared components efficiently.

- **Support singleton and non-singleton page factory types**  
  _As a developer_, I want to define a page factory as singleton or non-singleton, _so that_ I can conform to the intended design pattern.

- **Support singleton and non-singleton POM additions**  
  _As a developer_, when I add a POM to a page factory, I want to specify its instantiation pattern (singleton/non-singleton), _so that_ object handling is correct.

- **Create instance variables at POM level**  
  _As a user_, I want to add variables like selectors, locators, elements, or lazy locators to a POM, _so that_ I can define necessary UI interaction points.

- **Batch creation of instance variables**  
  _As a user_, I want the ability to batch-create selectors, elements, or locators when setting up a POM, _so that_ I can speed up development workflows.

- **Create selector registries (global or POM-specific)**  
  _As a developer_, I want to create selector registries that are either globally shared or tied to specific POMs, with support for simple, component-based, or hierarchical structures, _so that_ selectors are modular and reusable.

- **Migrate selectors from POM to selector registry**  
  _As a user_, I want to migrate selectors defined in a POM to either a global or POM-specific selector registry, _so that_ I can centralize selector management.

- **Directly add selectors to registry**  
  _As a user_, I want to directly add new selectors to the global or POM-specific registry, _so that_ I don’t have to define them inside a POM first.

- **Use selectors from registry as variables based on scope**  
  _As a user_, I should be able to use a selector from the selector registry by creating an instance variable for it in a class, or a normal variable in a spec file, _so that_ usage follows best practices based on context—with dynamic import of the registry file handled automatically.

- **Create and use locators derived from selectors**  
  _As a user_, I should be able to create locators from selectors (not the selectors themselves) and use them in a POM or spec file, _so that_ I can maintain clean abstraction and precise targeting for automation actions.
