/**
 * SnapWright POM Extension - Usage Demo
 *
 * This demonstrates the complete PageFactory pattern with:
 * 1. Playwright Page integration
 * 2. Modern singleton pattern with static getters
 * 3. Direct exports for easy access
 * 4. Global page management
 * 5. Code snippets usage examples
 *
 * To use this demo:
 * 1. Press F5 to launch the extension in development mode
 * 2. Create a PageFactory using "SnapWright: Create PageFactory" command
 * 3. Add POM classes using "SnapWright: Add POM Classes to PageFactory" command
 * 4. Try the code snippets: pfinst, pfsetup, pfpage, etc.
 */

import { type Page } from "@playwright/test";
import { pageFactory, setPage, page, homePage } from "./PageFactory";

// === New PageFactory Pattern ===

/*
The extension now generates this pattern:

import { type Page } from "@playwright/test";

class PageFactory {
  private static _instance: PageFactory;
  private _globalPage: Page;
  private _homepage: HomePage;

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

  public get homePage(): HomePage {
    if (!this._homepage) this._homepage = new HomePage();
    return this._homepage;
  }
}

export const pageFactory = PageFactory.instance;
export const setPage = PageFactory.instance.setPage;
export const page = PageFactory.instance.page;
export const homePage = PageFactory.instance.homePage;
*/

// === Usage Examples ===

async function demonstrateNewPattern(browserPage: Page) {
  // 1. Setup the global page (this makes it available to all POM classes)
  setPage(browserPage);

  // 2. Access page anywhere in your code
  const currentPage = page; // This is the global Playwright page

  // 3. Use POM classes directly (they automatically use the global page)
  const home = homePage; // Direct access to singleton POM instance
  const login = pageFactory.loginpage;
  const profile = pageFactory.profilepage;

  // 4. Demonstrate how POM classes use the global page
  console.log("=== POM Classes Using Global Page Demo ===");

  // Login flow - POM uses global page internally
  await login.navigate(); // Calls page.goto('/login') internally
  await login.login("testuser", "password123"); // Uses page.fill(), page.click() internally

  // Home page interactions - POM uses global page internally
  await home.navigate(); // Calls page.goto('/') internally
  await home.search("test automation"); // Uses page.fill(), page.press() internally

  // Profile updates - POM uses global page internally
  await profile.updateProfile("John Doe", "john@example.com"); // Uses page.fill(), page.click() internally

  console.log("All POM classes successfully used the global page!");
}

// === Enhanced Code Snippets ===

/*
New snippets available:

1. pfinst → const pf = pageFactory;
2. pfsetup → Complete setup with imports and page setup
3. pfpage → Page setup pattern
4. pfimport → import { pageFactory, setPage, page } from './PageFactory';
5. pfprop → const propertyName = pageFactory.pomProperty;

*/

// === How POM Classes Use Global Page ===

/*
Each POM class imports and uses the global page from PageFactory:

// LoginPage.ts
import { page } from '../PageFactory';

export class LoginPage {
  async login(username: string, password: string): Promise<void> {
    await page.goto('/login');              // Uses global page
    await page.fill('#username', username); // Uses global page
    await page.fill('#password', password); // Uses global page
    await page.click('#login-btn');         // Uses global page
  }
}

// HomePage.ts  
import { page } from '../PageFactory';

export class HomePage {
  async search(query: string): Promise<void> {
    await page.fill('#search', query);      // Uses global page
    await page.press('#search', 'Enter');   // Uses global page
  }
}

This pattern ensures:
✅ All POM classes use the same page instance
✅ No need to pass page as constructor parameter
✅ Clean, simple POM class constructors
✅ Global page management in one place
*/

// === Test Integration Example ===

/*
// Complete Playwright test example showing the pattern in action:
import { test, expect } from '@playwright/test';
import { setPage, loginpage, homepage, profilepage } from './PageFactory';

test('complete user flow test', async ({ page }) => {
    // 1. Setup global page (makes it available to all POM classes)
    setPage(page);
    
    // 2. Use POM classes - they automatically use the global page
    
    // Login flow
    await loginpage.navigate();                    // Calls page.goto('/login')
    await loginpage.login('testuser', 'password'); // Calls page.fill(), page.click()
    
    // Home page interactions
    await homepage.navigate();                     // Calls page.goto('/')
    await homepage.search('test automation');     // Calls page.fill(), page.press()
    expect(await homepage.isLoggedIn()).toBe(true); // Calls page.locator().isVisible()
    
    // Profile management
    await profilepage.navigate();                  // Calls page.goto('/profile')
    await profilepage.updateProfile('John Doe', 'john@test.com'); // Multiple page calls
    
    // All POM methods used the same global page instance!
});

test('simple login test', async ({ page }) => {
    setPage(page);                                 // Setup once
    
    await loginpage.login('user', 'pass');        // POM handles all page interactions
    expect(await homepage.isLoggedIn()).toBe(true);
});
*/

export class PageFactoryDemo {
  async showKeyFeatures() {
    console.log(`
        SnapWright PageFactory Features:
        
        1. 🎭 Playwright Integration: Native Page object support with TypeScript types
        2. 🏗️ Modern Singleton: Clean static getter pattern for instance management
        3. 📦 Direct Exports: Import exactly what you need - pageFactory, setPage, page, or individual POM classes
        4. 🌐 Global Page Management: Set the page once, automatically available to all POM classes
        5. 🚀 Clean Test Code: Minimal setup with maximum functionality
        6. 🔧 Simple Access: Direct property access (pageFactory.loginPage) without method calls
        7. 🛡️ Type Safety: Full TypeScript support with Playwright's Page type
        8. 🔄 Auto-instantiation: POM classes created on first access and reused
        9. 📝 VS Code Integration: Command palette commands and code snippets for rapid development
        10. 🎯 Best Practices: Follows modern JavaScript/TypeScript patterns and conventions
        `);
  }
}

export { demonstrateNewPattern };
