# SnapWright

**VS Code extension for Playwright TypeScript Page Object Model automation**

Generate PageFactories, manage Page Objects, and streamline test development with smart import consolidation.

## 🚀 Quick Start

1. **Create PageFactory**: `Ctrl+Shift+P` → "SnapWright: Create Page Factory"
2. **Add Page Objects**: `Ctrl+Shift+P` → "SnapWright: Add Page Object to Page Factory"
3. **Use in Tests**: `Ctrl+Shift+P` → "SnapWright: Use Page Object from Page Factory"

## 🎬 Visual Demonstrations

### Creating Page Factory
![Create Page Factory](demos/Create%20Page%20Factory.gif)

### Adding Page Objects to Factory
![Add Page Objects to Page Factory](demos/Add%20Page%20Objects%20to%20Page%20Factory.gif)

### Using Page Objects in Tests
![Use Page Object from Page Factory](demos/Use%20Page%20Object%20from%20Page%20Factory.gif)

### Creating Page Objects with Page Parameter
![Create Page Object by passing page](demos/Create%20Page%20Object%20by%20passing%20page.gif)

### Complete Workflow: Create, Inject & Use
![Create Page Object, Create Page Factory and inject in it](demos/Create%20Page%20Object,%20Create%20Page%20Factory%20and%20inject%20in%20it.gif)

### Safe Deletion with Reference Checking
![Restriction of Page Object Deletion if References](demos/Restriction%20of%20Page%20Object%20Deletion%20if%20References.gif)

### Clean Deletion and Cleanup
![Delete Injected Page Object and Clean-up](demos/Delete%20Injected%20Page%20Object%20and%20Clean-up.gif)

### Deleting Page Factory
![Delete Page Factory](demos/Delete%20Page%20Factory.gif)

## 📋 Commands

| Command                             | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| **Create PageFactory**              | Generate singleton PageFactory class              |
| **Add Page Object to Factory**      | Import existing Page Objects with sorting options |
| **Create Page Object Class**        | Generate new Page Object templates                |
| **Use Page Object from Factory**    | Smart import assistant with consolidation         |
| **Remove Page Object from Factory** | Clean removal with import cleanup                 |
| **Delete PageFactory**              | Remove PageFactory and saved paths                |
| **Delete Page Object**              | Safe deletion with reference checking             |
| **Cleanup Orphaned Page Objects**   | Remove references to deleted files                |

## 📖 Usage Guide

### Setting Up Your First PageFactory

1. **Create PageFactory**:

   - Run command: `SnapWright: Create Page Factory`
   - Choose location and provide name (e.g., `MainPageFactory`)
   - Extension generates singleton pattern with proper structure

2. **Add Existing Page Objects**:

   - Run command: `SnapWright: Add Page Object to Page Factory`
   - Select your PageFactory from saved paths
   - Choose directory containing Page Object files
   - Select sorting option (modified time, created time, name)
   - Pick classes to add - imports and getters are auto-generated

3. **Create New Page Objects**:
   - Run command: `SnapWright: Create Page Object Class`
   - Choose template type and instantiation pattern
   - Option to immediately add to PageFactory after creation

### Smart Import Consolidation

SnapWright features intelligent import management:

**Before:**

```typescript
import { getLoginPage } from "./PageFactory";
// Adding another import would create:
import { getHomePage } from "./PageFactory";
```

**After (Smart Consolidation):**

```typescript
import { getHomePage, getLoginPage } from "./PageFactory";
```

- **Detects existing imports** from the same file
- **Consolidates new imports** with existing ones
- **Sorts alphabetically** automatically
- **Prevents duplicates** completely

### Using Page Objects in Tests

1. Run command: `SnapWright: Use Page Object from Page Factory`
2. Choose initialization pattern:
   - `getLoginPage()` - uses current/default page
   - `getLoginPage(page)` - passes explicit page parameter
3. Extension checks for existing usage and warns about duplicates
4. Place cursor where you want the const assignment
5. Smart import consolidation handles the rest

## 💻 What It Generates

### PageFactory Class

```typescript
import { type Page } from "@playwright/test";

class PageFactory {
  private static _instance: PageFactory;
  private _globalPage: Page;

  public static get instance() {
    if (!PageFactory._instance) PageFactory.setInstance();
    return PageFactory._instance;
  }

  public setPage(page: Page) {
    this._globalPage = page;
  }

  // Page Object getters added automatically:
  public getLoginPage(page?: Page): LoginPage {
    this.ensurePageSet(page);
    if (!this._loginPage) this._loginPage = new LoginPage();
    return this._loginPage;
  }
}

export const pageFactory = PageFactory.instance;
export const getLoginPage = PageFactory.instance.getLoginPage;
```

### Page Object Template

```typescript
import { page } from "../PageFactory";

export class LoginPage {
  public constructor() {
    // Initialize page elements
  }

  // Add your page methods here
}
```

### Test Usage Example

```typescript
import { getHomePage, getLoginPage } from "./PageFactory";

test("login flow", async ({ page }) => {
  const loginPage = getLoginPage(page);
  const homePage = getHomePage();

  await loginPage.login("user@test.com", "password");
  await homePage.verifyLoggedIn();
});
```

## ⚙️ Configuration

Customize SnapWright behavior through VS Code settings:

```json
{
  "snapwright.fileExtensions.pageObject": ".page.ts",
  "snapwright.fileExtensions.pageFactory": ".ts",
  "snapwright.fileExtensions.typescript": ".ts",
  "snapwright.namingConventions.classSuffix": "Page",
  "snapwright.namingConventions.propertyPrefix": "_",
  "snapwright.namingConventions.fileNameCase": "camelCase",
  "snapwright.validation.classNamePattern": "^[a-zA-Z][a-zA-Z0-9]*$",
  "snapwright.validation.fileNamePattern": "^[a-zA-Z][a-zA-Z0-9]*$",
  "snapwright.validation.preventNesting": true,
  "snapwright.importPaths.defaultPrefix": "./",
  "snapwright.importPaths.useRelativePaths": true,
  "snapwright.templates.pageFactory": "",
  "snapwright.templates.pageObjectClass": ""
}
```

### File Naming Options

- **camelCase**: `homePage.ts`
- **kebab-case**: `home-page.ts`
- **snake_case**: `home_page.ts`

### Custom Templates

Use `${className}` placeholder in custom templates for dynamic class name injection.

### Architectural Boundaries

Set `"snapwright.validation.preventNesting": false` to allow nested PageFactories (not recommended for maintainability).

## 🔧 Key Features

- **Smart Path Detection**: Finds PageFactory by class name, not filename
- **Persistent Storage**: Remembers PageFactory locations across sessions
- **Batch Operations**: Add multiple Page Objects with flexible sorting
- **Import Consolidation**: Intelligent import management prevents duplicates
- **Safety Checks**: Reference validation before deletion operations
- **Template Generation**: Clean, properly structured TypeScript code
- **Usage Validation**: Warns about existing implementations before adding duplicates

## 🎯 Workflows

### 1. Complete Setup Workflow

1. Create PageFactory in your project root
2. Create/import existing Page Objects
3. Use smart import assistant in test files
4. Leverage consolidation for clean imports

### 2. Maintenance Workflow

1. Use reference checking before deletions
2. Clean up orphaned references automatically
3. Consolidate imports as you add new Page Objects

### 3. Development Workflow

1. Generate new Page Objects with templates
2. Immediately add to PageFactory (optional)
3. Use in tests with smart assistance
4. Maintain clean, organized imports

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Made with ❤️ for Playwright developers**
