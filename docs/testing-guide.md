# Testing the SnapWright POM Extension

## How to Test the Extension

### 1. Run Extension in Development Mode

1. **Open the project in VS Code**
2. **Press F5** or go to Run and Debug view and click "Extension"
3. **A new VS Code window will open** with your extension loaded

### 2. Test Creating PageFactory

1. In the new window, **open a workspace folder** or create a new one
2. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. **Type "SnapWright"** - you should see the commands:
   - `SnapWright: Create PageFactory`
   - `SnapWright: Add POM Classes to PageFactory`
4. **Select "Create PageFactory"**
5. **Choose a directory** where you want the PageFactory.ts file
6. **Verify** that PageFactory.ts is created with the singleton pattern

### 3. Test Adding POM Classes

1. **Create some sample POM classes** (or use the ones in `examples/pages/`)
2. **Run "Add POM Classes to PageFactory"** command
3. **Select the directory** containing your POM classes
4. **Choose which classes** to add (you can select multiple)
5. **Verify** that PageFactory.ts is updated with:
   - Import statements for your POM classes
   - Private properties for each class
   - Singleton getter methods

### 4. Test Code Snippets

1. **Create a new TypeScript file**
2. **Type the following snippets** and press Tab:
   - `pfinst` → Should create PageFactory instance
   - `pfprop` → Should create POM property reference
   - `pfimport` → Should create import statement
   - `pomclass` → Should create POM class template

### 5. Test Generated Code

After creating PageFactory and adding POM classes, test that the generated code works:

```typescript
import { PageFactory } from "./PageFactory";

// This should work without errors
const factory = PageFactory.getInstance();
const loginPage = factory.loginpage;
const homePage = factory.homepage;
```

## Expected Results

### PageFactory.ts Structure

```typescript
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

export class PageFactory {
  private static instance: PageFactory;

  private constructor() {
    // Private constructor
  }

  private _loginpage: LoginPage | undefined;
  private _homepage: HomePage | undefined;

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
}
```

## Troubleshooting

### Extension Doesn't Load

- Check VS Code Developer Console (`Help > Toggle Developer Tools`)
- Look for error messages in the console

### Commands Not Appearing

- Make sure extension is activated
- Check that you're in a workspace folder
- Verify package.json configuration

### Code Generation Issues

- Ensure POM classes are properly exported
- Check file paths and imports
- Verify TypeScript syntax
