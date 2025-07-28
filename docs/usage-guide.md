# SnapWright - Complete Usage Guide

## Quick Start

### Step 1: Create PageFactory

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "SnapWright: Create PageFactory"
3. Select a directory (e.g., `src` or `tests`)
4. PageFactory.ts will be created with Playwright integration

### Step 2: Create Page Object Classes

Create your Page Object Model classes that use the global page from PageFactory:

```typescript
import { page } from "../PageFactory";

export class LoginPage {
  async navigate(): Promise<void> {
    await page.goto("/login");
  }

  async login(username: string, password: string): Promise<void> {
    await page.fill("#username", username);
    await page.fill("#password", password);
    await page.click("#login-btn");
  }

  async isLoginFormVisible(): Promise<boolean> {
    return await page.locator("#login-form").isVisible();
  }
}
```

### Step 3: Add Page Object Classes to PageFactory

1. Open Command Palette
2. Type "SnapWright: Add Page Object Classes to PageFactory"
3. Select directory containing your Page Object classes
4. Choose which classes to add
5. PageFactory will be automatically updated with imports and direct exports

### Step 4: Use in Your Tests

```typescript
import { test } from "@playwright/test";
import { getLoginPage, getHomePage } from "./PageFactory";

test("user login flow", async ({ page }) => {
  // Option 1: Pass page to each getter for explicit page setting
  await getLoginPage(page).navigate();
  await getLoginPage().login("testuser", "password123");

  // Option 2: Set page once, then use without page parameter
  await getHomePage(page).navigate();
  expect(await getHomePage().isLoggedIn()).toBe(true);
});

test("multi-page scenario", async ({ page, context }) => {
  // Use different pages for different actions
  const newPage = await context.newPage();

  await getLoginPage(page).navigate();
  await getHomePage(newPage).navigate();

  // Continue using previous page contexts
  await getLoginPage().login("user", "pass"); // Uses 'page'
  await getHomePage().verifyHomePage(); // Uses 'newPage'
});
```

## Code Snippets

### Essential Snippets

#### `pfsetup` - Complete Test Setup

```typescript
import { setPage, pageFactory } from "./PageFactory";

// In your test setup
setPage(page);
```

#### `pfinst` - PageFactory Instance Reference

```typescript
const pf = pageFactory;
```

#### `pfpage` - Global Page Access

```typescript
import { page } from "./PageFactory";

// Use global page directly
await page.goto("/login");
```

#### `pfimport` - Import PageFactory Utilities

```typescript
import { pageFactory, setPage, page } from "./PageFactory";
```

#### `pfprop` - Access Page Object Instances

```typescript
const loginPage = pageFactory.loginPage;
```

#### `pageobjectclass` - Create Page Object Class Template

Creates a new Page Object class with proper Playwright integration.

## Generated PageFactory Structure

The extension creates a PageFactory with these key features:

### Core Features

- **Playwright Integration**: Direct `Page` object support with TypeScript types
- **Global Page Management**: Set page once, use everywhere
- **Direct Exports**: Import exactly what you need
- **Singleton Pattern**: Modern static getter approach
- **Auto-instantiation**: Page Object classes created on first access

### Generated Code Example

```typescript
import { type Page } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

class PageFactory {
  private static _instance: PageFactory;
  private _globalPage: Page;
  private _loginPage: LoginPage;
  private _homePage: HomePage;

  public static get instance() {
    if (!PageFactory._instance) PageFactory.setInstance();
    return PageFactory._instance;
  }

  public setPage(page: Page) {
    this._globalPage = page;
  }

  public get page(): Page {
    if (!this._globalPage)
      throw new Error("Page not set. Use setPage(page) first.");
    return this._globalPage;
  }

  public get loginPage(): LoginPage {
    if (!this._loginPage) this._loginPage = new LoginPage();
    return this._loginPage;
  }

  private ensurePageSet(page?: Page): void {
    if (!this._globalPage) {
      if (!page) throw new Error("Page not set. Use setPage(page) first.");
      this.setPage(page);
    }
  }

  public getHomePage(page?: Page): HomePage {
    this.ensurePageSet(page);
    if (!this._homePage) this._homePage = new HomePage();
    return this._homePage;
  }
}

export const pageFactory = PageFactory.instance;
export const setPage = pageFactory.setPage.bind(pageFactory);
export const page = pageFactory.page;
export const getLoginPage = pageFactory.getLoginPage;
export const getHomePage = pageFactory.getHomePage;
```

## Commands Available

### 1. Create PageFactory

**Command**: `SnapWright: Create PageFactory`

- Creates PageFactory.ts with Playwright integration
- Sets up singleton pattern with direct exports
- Includes global page management

### 2. Add Page Object Classes to PageFactory

**Command**: `SnapWright: Add Page Object Classes to PageFactory`

- Scans directory for TypeScript Page Object classes
- **Smart Duplicate Detection**: Prevents adding existing classes
- Automatically generates imports and getters
- Updates direct exports

### 3. Create PageFactory Instance

**Command**: `SnapWright: Create PageFactory Instance (Smart Import)`

- Intelligently creates PageFactory reference
- Auto-detects existing imports
- Resolves correct relative paths

## Best Practices

### 1. Project Structure

```
src/
├── pages/                 # All Page Object classes
│   ├── LoginPage.ts
│   ├── HomePage.ts
│   ├── ProfilePage.ts
│   └── CheckoutPage.ts
├── tests/
│   ├── PageFactory.ts     # Generated PageFactory
│   ├── login.test.ts
│   ├── checkout.test.ts
│   └── profile.test.ts
└── utils/
    └── test-helpers.ts
```

### 2. Page Object Class Design

**✅ Good Practice:**

```typescript
import { page } from "../PageFactory";

export class LoginPage {
  // Use descriptive method names
  async navigateToLogin(): Promise<void> {
    await page.goto("/login");
  }

  // Use specific selectors
  async enterCredentials(username: string, password: string): Promise<void> {
    await page.fill('[data-testid="username"]', username);
    await page.fill('[data-testid="password"]', password);
  }

  // Return meaningful data
  async getErrorMessage(): Promise<string> {
    return await page.textContent('[data-testid="error-message"]');
  }
}
```

### 3. Test Organization

**✅ Good Practice:**

```typescript
import { test, expect } from "@playwright/test";
import { getLoginPage, getHomePage, getProfilePage } from "./PageFactory";

test.describe("User Management", () => {
  test("complete user flow", async ({ page }) => {
    // Use getters with page parameter for explicit control
    await getLoginPage(page).navigateToLogin();
    await getLoginPage().enterCredentials("testuser", "password");

    // Navigate to profile
    await getHomePage().navigateToProfile();
    await getProfilePage().updateEmail("new@email.com");

    // Verify changes
    expect(await profilePage.getEmail()).toBe("new@email.com");
  });
});
```

### 4. Error Handling

```typescript
import { page } from "../PageFactory";

export class BasePage {
  async waitForPageLoad(): Promise<void> {
    await page.waitForLoadState("networkidle");
  }

  async handleErrors(): Promise<boolean> {
    const errorElement = page.locator('[data-testid="error"]');
    return await errorElement.isVisible();
  }
}
```

## Advanced Features

### Smart Duplicate Detection

- **Import Detection**: Prevents duplicate imports in PageFactory
- **Property Detection**: Prevents duplicate private properties
- **Feedback**: Shows which classes were skipped

### Intelligent Path Resolution

- **Auto-Detection**: Finds correct import paths automatically
- **Relative Paths**: Works from any project structure
- **Context-Aware**: Adapts to your file organization

## Troubleshooting

### Common Issues

#### 1. "Page not set" Error

**Problem**: Trying to use Page Object classes before setting the global page
**Solution**: Always call `setPage(page)` before using Page Object classes

#### 2. Import Errors

**Problem**: Cannot find PageFactory or Page Object classes
**Solution**: Check file paths and ensure exports are correct

#### 3. Extension Commands Not Visible

**Problem**: SnapWright commands don't appear in Command Palette
**Solution**:

- Ensure you're in a workspace folder
- Restart VS Code
- Check extension is installed and enabled

#### 4. Page Object Classes Not Added

**Problem**: Classes aren't detected when adding to PageFactory
**Solution**:

- Verify classes are exported: `export class ClassName`
- Ensure files have `.ts` extension
- Check directory path is correct

### Getting Help

1. **Check Examples**: Look at the generated `examples/` folder
2. **Review Snippets**: Use code snippets for quick setup
3. **Verify Structure**: Ensure proper project organization
4. **Test Step by Step**: Start with simple Page Object classes first

## Example Workflows

### Workflow 1: New Project Setup

1. Create PageFactory using command palette
2. Create your first Page Object class (e.g., LoginPage)
3. Add Page Object class to PageFactory using command
4. Write your first test using `pfsetup` snippet
5. Expand with more Page Object classes as needed

### Workflow 2: Adding to Existing Project

1. Create PageFactory in your test directory
2. Use command to add existing Page Object classes
3. Update tests to use global page pattern
4. Refactor Page Object classes to import global page
5. Enjoy cleaner, more maintainable tests
