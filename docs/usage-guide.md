# Usage Guide for SnapWright POM Extension

## Quick Start

### Step 1: Create PageFactory

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "SnapWright: Create PageFactory"
3. Select a directory (e.g., `src` or `tests`)
4. PageFactory.ts will be created

### Step 2: Create POM Classes

Create your Page Object Model classes in TypeScript. Example:

```typescript
export class LoginPage {
  constructor() {
    // Initialize page elements
  }

  async login(username: string, password: string): Promise<void> {
    // Login implementation
  }
}
```

### Step 3: Add POM Classes to PageFactory

1. Open Command Palette
2. Type "SnapWright: Add POM Classes to PageFactory"
3. Select directory containing your POM classes
4. Choose which classes to add
5. PageFactory will be automatically updated

### Step 4: Use Code Snippets

#### pfinst - PageFactory Instance

Type `pfinst` and press Tab:

```typescript
const pageFactoryInstance = PageFactory.getInstance();
```

#### pfprop - POM Property Access

Type `pfprop` and press Tab:

```typescript
const propertyName = PageFactory.getInstance().pomProperty;
```

#### pfimport - Import PageFactory

Type `pfimport` and press Tab:

```typescript
import { PageFactory } from "./PageFactory";
```

#### pomclass - Create POM Class

Type `pomclass` and press Tab to create a new POM class template.

## Best Practices

1. **Organize POM Classes**: Keep all POM classes in a dedicated folder (e.g., `pages/` or `page-objects/`)

2. **Use Descriptive Names**: Name your POM classes clearly (e.g., `LoginPage`, `DashboardPage`)

3. **Single Responsibility**: Each POM class should represent one page or logical component

4. **Consistent Patterns**: Use consistent method naming across all POM classes

## Example Project Structure

```
src/
├── pages/
│   ├── LoginPage.ts
│   ├── HomePage.ts
│   └── ProfilePage.ts
├── tests/
│   ├── PageFactory.ts
│   └── login.test.ts
└── utils/
    └── test-helpers.ts
```

## Troubleshooting

### Extension Not Working

- Make sure you're in a workspace folder
- Check that the extension is activated (look for SnapWright commands in Command Palette)

### PageFactory Not Found

- Ensure PageFactory.ts was created first
- Check that it's in the correct directory structure

### POM Classes Not Added

- Verify that your classes are exported with `export class`
- Make sure files have `.ts` extension
- Check that the directory path is correct
