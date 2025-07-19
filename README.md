# SnapWright POM Extension

A Visual Studio Code extension for generating Page Object Model (POM) classes and PageFactory patterns for test automation.

## Features

### Command Palette Commands

1. **Create PageFactory** (`SnapWright: Create PageFactory`)

   - Creates a `PageFactory.ts` file in your selected directory
   - Implements a singleton pattern for managing POM instances
   - Provides a centralized way to access all your page objects

2. **Add POM Classes to PageFactory** (`SnapWright: Add POM Classes to PageFactory`)

   - Automatically scans a selected directory for TypeScript POM classes
   - **🆕 Smart Duplicate Detection**: Prevents adding classes that already exist
   - **🆕 Enhanced Feedback**: Shows which classes were skipped due to duplicates
   - Generates getters for easy access to POM instances

3. **🆕 Create PageFactory Instance (Smart Import)** (`SnapWright: Create PageFactory Instance (Smart Import)`)
   - Intelligently creates PageFactory instance with automatic import handling
   - Detects existing imports to avoid duplicates
   - Finds correct relative path to PageFactory automatically

### Code Snippets

- **`pfinst`** - Creates a constant with reference to the PageFactory instance

  ```typescript
  const pageFactory = PageFactory.getInstance();
  ```

- **🆕 `pfinstfull`** - Creates PageFactory instance with explicit import

  ```typescript
  import { PageFactory } from "./PageFactory";

  const pageFactory = PageFactory.getInstance();
  ```

- **`pfprop`** - Creates a constant with reference to POM singleton instances

  ```typescript
  const propertyName = PageFactory.getInstance().pomProperty;
  ```

- **`pfimport`** - Imports the PageFactory class

  ```typescript
  import { PageFactory } from "./PageFactory";
  ```

- **🆕 `pfuse`** - Complete PageFactory usage pattern

  ```typescript
  // Get PageFactory instance
  const pageFactory = PageFactory.getInstance();

  // Access POM classes
  const pomInstance = pageFactory.pomProperty;

  // Use POM methods
  await pomInstance.methodName();
  ```

- **`pomclass`** - Creates a basic POM class template

### 🆕 Enhanced Edge Case Handling

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
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";

export class PageFactory {
  private static instance: PageFactory;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  private _loginpage: LoginPage | undefined;
  private _homepage: HomePage | undefined;
  private _profilepage: ProfilePage | undefined;

  public static getInstance(): PageFactory {
    if (!PageFactory.instance) {
      PageFactory.instance = new PageFactory();
    }
    return PageFactory.instance;
  }

  public get loginpage(): LoginPage {
    if (!this._loginpage) {
      this._loginpage = new LoginPage();
    }
    return this._loginpage;
  }

  public get homepage(): HomePage {
    if (!this._homepage) {
      this._homepage = new HomePage();
    }
    return this._homepage;
  }

  public get profilepage(): ProfilePage {
    if (!this._profilepage) {
      this._profilepage = new ProfilePage();
    }
    return this._profilepage;
  }
}

export const pageFactory = PageFactory.getInstance();
```

### Using in Tests

```typescript
import { PageFactory } from "./PageFactory";

// Using pfinst snippet
const pageFactoryInstance = PageFactory.getInstance();

// Using pfprop snippet
const loginPage = PageFactory.getInstance().loginpage;
const homePage = PageFactory.getInstance().homepage;

// Test example
async function loginTest() {
  await loginPage.login("username", "password");
  const isLoggedIn = await homePage.isLoggedIn();
  console.log("Login successful:", isLoggedIn);
}
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
