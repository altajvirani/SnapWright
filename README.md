# SnapWright POM Extension

A Visual Studio Code extension for generating Page Object Model (POM) classes and PageFactory patterns for test automation with **Playwright integration**.

## � Playwright-Integrated PageFactory Pattern

The extension generates a modern PageFactory with **Playwright integration** and **direct exports**:

```typescript
import { type Page } from "@playwright/test";

class PageFactory {
  private static _instance: PageFactory;
  private _globalPage: Page;
  private _homepage: HomePage;

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

  public get homePage(): HomePage {
    if (!this._homepage) this._homepage = new HomePage();
    return this._homepage;
  }
}

export const pageFactory = PageFactory.instance;
export const setPage = PageFactory.instance.setPage;
export const page = PageFactory.instance.page;
export const homePage = PageFactory.instance.homePage;
```

### 🎯 **Usage in Tests:**

```typescript
import { test } from "@playwright/test";
import { setPage, homePage } from "./PageFactory";

test("example test", async ({ page }) => {
  setPage(page); // Set global page once
  await homePage.navigate(); // Use POM directly
});
```

## Features

### Command Palette Commands

1. **Create PageFactory** (`SnapWright: Create PageFactory`)

   - Creates a `PageFactory.ts` file in your selected directory
   - Implements a singleton pattern for managing POM instances
   - Provides a centralized way to access all your page objects

2. **Add POM Classes to PageFactory** (`SnapWright: Add POM Classes to PageFactory`)

   - Automatically scans a selected directory for TypeScript POM classes
   - **Smart Duplicate Detection**: Prevents adding classes that already exist
   - **Enhanced Feedback**: Shows which classes were skipped due to duplicates
   - Generates getters for easy access to POM instances

3. **Create PageFactory Instance (Smart Import)** (`SnapWright: Create PageFactory Instance (Smart Import)`)
   - Intelligently creates PageFactory instance with automatic import handling
   - Detects existing imports to avoid duplicates
   - Finds correct relative path to PageFactory automatically

### Code Snippets

- **`pfinst`** - Creates a constant reference to the PageFactory instance

  ```typescript
  const pf = pageFactory;
  ```

- **`pfsetup`** - Complete setup with imports and page initialization

  ```typescript
  import { setPage, pageFactory } from "./PageFactory";

  // In your test setup
  setPage(page);
  ```

- **`pfpage`** - Global page access pattern

  ```typescript
  import { page } from "./PageFactory";

  // Use global page directly
  await page.goto("/login");
  ```

- **`pfimport`** - Import PageFactory utilities

  ```typescript
  import { pageFactory, setPage, page } from "./PageFactory";
  ```

- **`pfprop`** - Access POM instances from PageFactory

  ```typescript
  const loginPage = pageFactory.loginPage;
  ```

- **`pomclass`** - Creates a basic POM class template

### 🔧 Enhanced Edge Case Handling

#### Duplicate Detection

- **Import Detection**: Prevents duplicate imports in PageFactory
- **Property Detection**: Prevents duplicate private properties
- **Smart Notifications**: Informs you which classes were skipped

#### Smart Import Management

- **Auto-Detection**: Checks if PageFactory is already imported
- **Relative Path Resolution**: Finds correct import path automatically
- **Context-Aware**: Works from any file location in your project

## Installation & Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Compile the Extension**

   ```bash
   npm run compile
   ```

3. **Run in Development Mode**
   - Press `F5` to open a new VS Code window with the extension loaded
   - Or use the Debug view and run "Extension" configuration

## Usage

### 1. Creating a PageFactory

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "SnapWright: Create PageFactory"
3. Select a directory where you want to create the PageFactory
4. The `PageFactory.ts` file will be created with the singleton pattern

### 2. Adding POM Classes to PageFactory

1. Create your POM classes in TypeScript files
2. Open Command Palette
3. Type "SnapWright: Add POM Classes to PageFactory"
4. Select the directory containing your POM classes
5. Choose which classes to add to the PageFactory
6. The PageFactory will be automatically updated with imports and singleton getters

### 3. Using Code Snippets

In any TypeScript file:

- Type `pfinst` and press Tab to create a PageFactory instance reference
- Type `pfprop` and press Tab to create a POM property reference
- Type `pomclass` and press Tab to create a new POM class template

## Example

### Generated PageFactory.ts

```typescript
import { type Page } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";

class PageFactory {
  private static _instance: PageFactory;
  private _globalPage: Page;
  private _loginpage: LoginPage;
  private _homepage: HomePage;
  private _profilepage: ProfilePage;

  private constructor() {}

  private static setInstance() {
    PageFactory._instance = new PageFactory();
  }

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
    if (!this._loginpage) this._loginpage = new LoginPage();
    return this._loginpage;
  }

  public get homePage(): HomePage {
    if (!this._homepage) this._homepage = new HomePage();
    return this._homepage;
  }

  public get profilePage(): ProfilePage {
    if (!this._profilepage) this._profilepage = new ProfilePage();
    return this._profilepage;
  }
}

export const pageFactory = PageFactory.instance;
export const setPage = pageFactory.setPage.bind(pageFactory);
export const page = pageFactory.page;
export const loginPage = pageFactory.loginPage;
export const homePage = pageFactory.homePage;
export const profilePage = pageFactory.profilePage;
```

### Using in Tests

```typescript
import { test } from "@playwright/test";
import { setPage, loginPage, homePage } from "./PageFactory";

test("login flow test", async ({ page }) => {
  // Set global page once
  setPage(page);

  // Use POM classes directly - they automatically use the global page
  await loginPage.navigate();
  await loginPage.login("username", "password");

  // Verify login success
  const isLoggedIn = await homePage.isLoggedIn();
  console.log("Login successful:", isLoggedIn);
});

// Alternative: Using pageFactory instance
import { pageFactory, setPage } from "./PageFactory";

test("using pageFactory instance", async ({ page }) => {
  setPage(page);

  const login = pageFactory.loginPage;
  const home = pageFactory.homePage;

  await login.login("username", "password");
  await home.navigate();
});
```

## Development

### Project Structure

```
├── src/
│   └── extension.ts          # Main extension logic
├── snippets/
│   └── pom-snippets.json     # Code snippets definition
├── examples/
│   └── pages/                # Sample POM classes
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
└── .vscode/
    └── launch.json          # Debug configuration
```

### Building

- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch mode for development

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test the extension
5. Submit a pull request

## License

ISC License
