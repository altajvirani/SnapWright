# SnapWright

A Visual Studio Code extension that supercharges your Playwright TypeScript development with automated Page Object Model generation and intelligent PageFactory patterns.

## 🚀 Playwright TypeScript Productivity Booster

**SnapWright** streamlines your Playwright test automation workflow by providing intelligent code generation tools for Page Object Models and Factory patterns with smart Command Palette integration.

## ✨ Key Features

### 🎯 **Smart Command Palette Integration**

- **Dynamic Page Object Discovery**: Automatically reads your PageFactory and suggests available Page Object classes
- **Interactive Selection**: Choose from real Page Object getters with/without page parameters
- **Intelligent Import Management**: Auto-adds imports at proper locations
- **Cursor-Based Insertion**: Place const assignments exactly where you need them

### 🏗️ **Project Setup Commands**

- **Create PageFactory**: Generate singleton PageFactory with worker isolation
- **Add Page Objects to Factory**: Integrate existing Page Object Models
- **Create Page Object Classes**: Generate new Page Object Model class templates

### �️ **Architectural Integrity**

- **Circular Reference Prevention**: Automatically prevents Page Objects from importing their own PageFactory getters
- **Real-time Validation**: Smart detection of architectural violations during development
- **Clear Warning Messages**: Detailed explanations when violations are detected
- **Workspace Scanning**: Command to validate entire project architectural integrity

### �🔧 **Code Generation Tools**

- **camelCase Variables**: Proper JavaScript/TypeScript naming conventions
- **Smart Import Positioning**: Respects comments, ESLint configs, and existing imports
- **Flexible Page Parameters**: Support for both parameterized and global page usage

## 🎮 Quick Start

### 1. Create Your PageFactory

Open Command Palette (`Ctrl+Shift+P`) and run:

```
SnapWright: Create PageFactory
```

### 2. Add Page Object Classes

```
SnapWright: Add Page Objects to Factory
```

### 3. Use Page Objects in Your Tests

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Search**: "Use Page Object from PageFactory"
3. **Select**: Your desired Page Object with/without page parameter
4. **Import Added**: Automatically placed at top of file
5. **Place Cursor**: Move cursor where you want the const assignment
6. **Click**: "Insert Here" to complete

## 💡 Example Workflow

```typescript
// 1. Command Palette → "SnapWright: Use Page Object from PageFactory"
// 2. Select: "const topicsPage = getTopicsPage(page)"
// 3. Result:

import { getTopicsPage } from "./PageFactory";
import { test } from "@playwright/test";

test("My test", async ({ page }) => {
  const topicsPage = getTopicsPage(page); // ← Auto-inserted at cursor

  await topicsPage.navigate();
  await topicsPage.performAction();
});
```

## 📋 Generated PageFactory Structure

SnapWright generates a robust PageFactory with worker isolation support:

```typescript
import { type Page } from "@playwright/test";
import { TopicsPage } from "./topics.page";

class PageFactory {
  private static _instance: PageFactory;
  private _globalPage: Page;
  private _topicsPage: TopicsPage;

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

  private ensurePageSet(page?: Page): void {
    if (!this._globalPage) {
      if (!page) throw new Error("Page not set. Use setPage(page) first.");
      this.setPage(page);
    }
  }

  public getTopicsPage(page?: Page): TopicsPage {
    this.ensurePageSet(page);
    if (!this._topicsPage) this._topicsPage = new TopicsPage();
    return this._topicsPage;
  }
}

export const pageFactory = PageFactory.instance;
export const setPage = pageFactory.setPage.bind(pageFactory);
export const page = pageFactory.page;
export const getTopicsPage = pageFactory.getTopicsPage.bind(pageFactory);
```

## 🎯 Usage Patterns

### Pattern 1: Global Page Setup

```typescript
import { test } from "@playwright/test";
import { setPage, getTopicsPage } from "./PageFactory";

test("using global page", async ({ page }) => {
  setPage(page); // Set once

  const topicsPage = getTopicsPage(); // Uses global page
  await topicsPage.navigate();
});
```

### Pattern 2: Explicit Page Parameter

```typescript
import { test } from "@playwright/test";
import { getTopicsPage } from "./PageFactory";

test("using explicit page", async ({ page }) => {
  const topicsPage = getTopicsPage(page); // Pass page explicitly
  await topicsPage.navigate();
});
```

### Pattern 3: Parallel Test Support

```typescript
import { test } from "@playwright/test";
import { getTopicsPage } from "./PageFactory";

test.describe.configure({ mode: "parallel" });

test("parallel test 1", async ({ page }) => {
  const topicsPage = getTopicsPage(page); // Worker-isolated
});

test("parallel test 2", async ({ page }) => {
  const topicsPage = getTopicsPage(page); // Worker-isolated
});
```

## 🛠️ Available Commands

### Project Setup Commands

#### 1. **Create PageFactory**

```
Command: SnapWright: Create PageFactory
```

- Creates a singleton PageFactory with worker isolation support
- Implements `ensurePageSet()` helper for flexible page management
- Generates proper TypeScript imports and exports

#### 2. **Add Page Object Classes to PageFactory**

```
Command: SnapWright: Add Page Objects to Factory
```

- Scans directory for existing Page Object classes
- Smart duplicate detection prevents conflicts
- Auto-generates getter methods with proper typing
- Binds methods for export convenience

#### 3. **Create Page Object Class**

```
Command: SnapWright: Create Page Object Class
```

- Generates new Page Object class templates
- Follows Playwright best practices
- Includes constructor and method stubs

### Smart Usage Commands

#### 4. **Use Page Object from PageFactory** ⭐ New!

```
Command: SnapWright: Use Page Object from PageFactory
```

**Interactive Workflow:**

1. **Dynamic Discovery**: Reads your actual PageFactory exports
2. **Smart Selection**: Choose Page Object with/without page parameter
3. **Auto Import**: Adds imports at proper file location
4. **Cursor Placement**: You control exactly where const goes
5. **camelCase Variables**: Follows proper naming conventions

**Example Options:**

- `const topicsPage = getTopicsPage()`
- `const topicsPage = getTopicsPage(page)`
- `const homePage = getHomePage()`
- `const loginPage = getLoginPage(page)`

#### 5. **Validate Architectural Integrity** 🛡️ New!

```
Command: SnapWright: Validate Architectural Integrity
```

**Comprehensive Project Validation:**

1. **Circular Reference Detection**: Prevents Page Objects from importing their own PageFactory getters
2. **Workspace Scanning**: Validates entire project for architectural violations
3. **Real-time Warnings**: Shows detailed messages when violations are detected
4. **Best Practice Guidelines**: Provides recommendations for proper Page Object architecture

**Example Violation Detection:**

```typescript
// ❌ VIOLATION: LoginPage importing its own getter
import { getLoginPage } from "../PageFactory";

export class LoginPage {
  // This creates a circular dependency!
}
```

**Proper Architecture:**

```typescript
// ✅ CORRECT: Page Objects are used in tests, not self-referencing
// test-file.spec.ts
import { getLoginPage } from "../PageFactory";

test("login functionality", async ({ page }) => {
  const loginPage = getLoginPage(page);
  // Use loginPage methods...
});
```

## 📋 Code Snippets

SnapWright includes useful snippets for common patterns:

- **`pfinst`** - PageFactory instance reference
- **`pfimport`** - Direct PageFactory imports
- **`pfsetup`** - Complete setup with imports
- **`pageobjectclass`** - New Page Object class template
- **`pfpage`** - Page setup pattern

## 🎨 Smart Features

### ✅ **Intelligent Import Management**

- Detects existing imports to avoid duplicates
- Places imports after comments and ESLint configs
- Calculates correct relative paths automatically
- Respects file structure and formatting

### ✅ **Worker Isolation Support**

- `ensurePageSet()` helper method for parallel tests
- Flexible page parameter handling
- Global page fallback with explicit page option
- Thread-safe Page Object instance management

### ✅ **Developer Experience**

- Command Palette integration for discoverability
- Interactive selection with clear descriptions
- Real-time feedback and confirmation messages
- Error handling with helpful guidance

## 🚀 Installation

1. **From VS Code Marketplace**: Search "SnapWright" in Extensions panel
2. **From Command Line**: `code --install-extension altajvirani.snapwright`
3. **Manual**: Download `.vsix` from [GitHub Releases](https://github.com/altajvirani/snapwright/releases)

## 📁 Project Structure

```text
SnapWright/
├── src/
│   └── extension.ts          # Main extension logic
├── snippets/
│   └── page-object-snippets.json     # Code snippets
├── examples/
│   └── pages/                # Sample Page Object classes
├── docs/                     # Documentation
├── package.json              # Extension manifest
└── README.md                 # This file
```

## 🔧 Development

### Building from Source

```bash
git clone https://github.com/altajvirani/snapwright.git
cd snapwright
npm install
npm run compile
```

### Testing

```bash
# Watch mode for development
npm run watch

# Open in VS Code Extension Host
# Press F5 in VS Code to launch Extension Host
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/altajvirani/snapwright/issues)
- **Discussions**: [GitHub Discussions](https://github.com/altajvirani/snapwright/discussions)
- **Email**: altajvirani@example.com

## 🏷️ Changelog

### v1.3.0 (Latest)

- ✨ **New**: Command Palette integration for Page Object usage
- ✨ **New**: Interactive Page Object selection with real-time discovery
- ✨ **New**: Smart import management with proper positioning
- ✨ **New**: camelCase variable naming conventions
- ✨ **Improved**: Worker isolation support with `ensurePageSet()`
- 🗑️ **Removed**: Hardcoded typing patterns in favor of dynamic approach

### v1.2.0

- ✨ Added PageFactory singleton pattern
- ✨ Enhanced Page Object class integration
- 🐛 Fixed import path resolution

### v1.1.0

- ✨ Initial Page Object generation features
- ✨ Basic snippets support

---

**Made with ❤️ for the Playwright Testing Community**

```typescript
import { pageFactory, setPage, page } from "./PageFactory";
```

- **`pfprop`** - Access Page Object instances from PageFactory

  ```typescript
  const loginPage = pageFactory.loginPage;
  ```

- **`pageobjectclass`** - Creates a basic Page Object class template

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

### 2. Adding Page Object Classes to PageFactory

1. Create your Page Object classes in TypeScript files
2. Open Command Palette
3. Type "SnapWright: Add Page Object Classes to PageFactory"
4. Select the directory containing your Page Object classes
5. Choose which classes to add to the PageFactory
6. The PageFactory will be automatically updated with imports and singleton getters

### 3. Using Code Snippets

In any TypeScript file:

- Type `pfinst` and press Tab to create a PageFactory instance reference
- Type `pfprop` and press Tab to create a Page Object property reference
- Type `pageobjectclass` and press Tab to create a new Page Object class template

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

  // Use Page Object classes directly - they automatically use the global page
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
│   └── page-object-snippets.json     # Code snippets definition
├── examples/
│   └── pages/                # Sample Page Object classes
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
