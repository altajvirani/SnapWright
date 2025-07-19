# Testing Enhanced Edge Case Features

## 🧪 Test Scenarios for Enhanced SnapWright POM Extension

### Test Case 1: Duplicate Import Detection

**Objective**: Verify that the extension prevents duplicate imports in PageFactory

**Steps**:

1. Create PageFactory using `SnapWright: Create PageFactory`
2. Add LoginPage using `SnapWright: Add POM Classes to PageFactory`
3. Try to add LoginPage again using the same command
4. Select LoginPage from the list

**Expected Result**:

- Extension should show: "Skipped 1 class(es) that already exist: LoginPage"
- No duplicate imports or properties should be added
- PageFactory.ts should remain unchanged

---

### Test Case 2: Multiple Duplicates Detection

**Objective**: Test handling multiple duplicate classes

**Setup**:

```typescript
// Existing PageFactory.ts with LoginPage and HomePage already added
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

export class PageFactory {
  private _loginpage: LoginPage | undefined;
  private _homepage: HomePage | undefined;
  // ... rest of the class
}
```

**Steps**:

1. Try to add LoginPage, HomePage, and ProfilePage
2. Select all three classes

**Expected Result**:

- Extension should add only ProfilePage
- Show: "Skipped 2 class(es) that already exist: LoginPage, HomePage"
- Show: "Successfully added 1 new POM class(es) to PageFactory!"

---

### Test Case 3: Smart PageFactory Instance Creation (No Existing Import)

**Objective**: Test automatic import addition when PageFactory not imported

**Setup**: Create a new TypeScript file with no imports

```typescript
// test-file.ts - empty file or file without PageFactory import
export class TestClass {
  // some content
}
```

**Steps**:

1. Place cursor where you want the instance
2. Use `SnapWright: Create PageFactory Instance (Smart Import)` command

**Expected Result**:

```typescript
import { PageFactory } from "./PageFactory";

const pageFactory = PageFactory.getInstance();
export class TestClass {
  // some content
}
```

---

### Test Case 4: Smart Instance Creation (Existing Import)

**Objective**: Test that no duplicate import is added when PageFactory already imported

**Setup**: File with existing PageFactory import

```typescript
import { PageFactory } from "./PageFactory";
import { SomeOtherClass } from "./other";

export class TestClass {
  // some content
}
```

**Steps**:

1. Place cursor where you want the instance
2. Use `SnapWright: Create PageFactory Instance (Smart Import)` command

**Expected Result**:

```typescript
import { PageFactory } from "./PageFactory";
import { SomeOtherClass } from "./other";

const pageFactory = PageFactory.getInstance();
export class TestClass {
  // some content
}
```

_Note: No duplicate import should be added_

---

### Test Case 5: Enhanced Snippets Testing

**Objective**: Test new and enhanced code snippets

**New Snippets to Test**:

1. **`pfinstfull`** - Type and press Tab
   Expected:

   ```typescript
   import { PageFactory } from "./PageFactory";

   const pageFactory = PageFactory.getInstance();
   ```

2. **`pfuse`** - Type and press Tab
   Expected:

   ```typescript
   // Get PageFactory instance
   const pageFactory = PageFactory.getInstance();

   // Access POM classes
   const pomInstance = pageFactory.pomProperty;

   // Use POM methods
   await pomInstance.methodName();
   ```

---

### Test Case 6: Relative Path Resolution

**Objective**: Test automatic relative path detection for imports

**Setup**: Create test files in different directories

```
project/
├── src/
│   ├── tests/
│   │   └── test-file.ts
│   └── pages/
│       └── PageFactory.ts
```

**Steps**:

1. Open `test-file.ts`
2. Use `SnapWright: Create PageFactory Instance (Smart Import)`

**Expected Result**:

```typescript
import { PageFactory } from "../pages/PageFactory";

const pageFactory = PageFactory.getInstance();
```

---

### Test Case 7: Error Handling

**Objective**: Test extension behavior when PageFactory doesn't exist

**Steps**:

1. Try to use `SnapWright: Add POM Classes to PageFactory` without creating PageFactory first
2. Try smart instance creation when PageFactory.ts doesn't exist

**Expected Results**:

- Should show error: "PageFactory.ts not found. Please create it first."
- Should fall back to default import path: `'./PageFactory'`

---

## 🚀 How to Run These Tests

1. **Launch Extension**: Press F5 to open Extension Development Host
2. **Create Test Workspace**: Open a folder in the new VS Code window
3. **Run Each Test Case**: Follow the steps above systematically
4. **Verify Results**: Check that the behavior matches expected results

## 🐛 Common Issues to Watch For

- Duplicate imports being added
- Incorrect relative paths in imports
- Properties not being detected correctly
- Notifications not showing
- Extension commands not appearing in Command Palette

## ✅ Success Criteria

- ✅ No duplicate imports in PageFactory
- ✅ No duplicate properties in PageFactory
- ✅ Smart import detection works correctly
- ✅ Relative paths are calculated correctly
- ✅ User feedback is clear and helpful
- ✅ All snippets work as expected
