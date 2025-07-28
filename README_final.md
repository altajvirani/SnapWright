# SnapWright

![SnapWright Logo](SnapWright_Logo.png)

**VS Code extension for Playwright TypeScript Page Object Model automation**

Generate PageFactories, manage Page Objects, and streamline test development.

## 🚀 Quick Start

1. **Create PageFactory**: `Ctrl+Shift+P` → "SnapWright: Create Page Factory"
2. **Add Page Objects**: `Ctrl+Shift+P` → "SnapWright: Add Page Object Page to Factory"
3. **Use in Tests**: `Ctrl+Shift+P` → "SnapWright: Use Page Object from Page Factory"

## 📋 Commands

| Command                             | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| **Create PageFactory**              | Generate singleton PageFactory class              |
| **Add Page Object to Factory**      | Import existing Page Objects with sorting options |
| **Create Page Object Class**        | Generate new Page Object templates                |
| **Use Page Object from Factory**    | Smart import assistant for tests                  |
| **Remove Page Object from Factory** | Clean removal with import cleanup                 |
| **Delete PageFactory**              | Remove PageFactory and saved paths                |
| **Cleanup Orphaned Page Objects**   | Remove references to deleted files                |

## 💻 What It Generates

### PageFactory

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

### Page Object

```typescript
import { page } from "../PageFactory";

export class LoginPage {
  public constructor() {
    // Initialize page elements
  }

  // Add your page methods here
}
```

### Test Usage

```typescript
import { getLoginPage, getHomePage } from "./PageFactory";

test("login flow", async ({ page }) => {
  const loginPage = getLoginPage(page);
  const homePage = getHomePage();

  await loginPage.login("user@test.com", "password");
  await homePage.verifyLoggedIn();
});
```

## 🔧 Features

- **Smart Detection**: Finds PageFactory by class name, not filename
- **Path Management**: Remembers PageFactory locations across sessions
- **Batch Import**: Add multiple Page Objects with sorting (time, name)
- **Auto Import**: Intelligent import positioning and management
- **Duplicate Prevention**: Skips existing classes automatically
- **Clean Templates**: Generates proper TypeScript code

## ⚙️ Configuration

```json
{
  "snapwright.fileExtensions.pageObject": ".page.ts",
  "snapwright.namingConventions.classSuffix": "Page",
  "snapwright.namingConventions.fileNameCase": "camelCase",
  "snapwright.importPaths.useRelativePaths": true
}
```

## 🎯 Key Workflows

### 1. Add Existing Page Objects

1. Select PageFactory from saved paths
2. Choose directory with Page Object files
3. Pick classes to add (with sorting options)
4. Auto-generates imports, properties, getters, exports

### 2. Use Page Objects in Tests

1. Scans PageFactory for available getters
2. Shows options: `getLoginPage(page)` vs `getLoginPage()`
3. Adds import at proper location
4. Insert const assignment at cursor

### 3. Clean Removal

1. Select Page Objects to remove
2. Removes imports, properties, getters, exports
3. Preserves PageFactory structure

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Made with ❤️ for Playwright developers**
