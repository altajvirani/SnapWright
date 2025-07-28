// ✅ CORRECT USAGE: Using PageFactory getters in test files
import { getLoginPage, getHomePage, setPage } from "../PageFactory";
// import { test, expect } from "@playwright/test"; // Commented out since playwright is not installed

/**
 * Example test file demonstrating CORRECT usage of PageFactory
 *
 * ✅ This is where you SHOULD use PageFactory getters:
 * - In test files (.spec.ts, .test.ts)
 * - In utility functions
 * - In other Page Objects (when needed)
 *
 * ❌ NEVER use getters inside the same Page Object class they return
 */

// Example test structure (commented since playwright is not available)
/*
test.describe("Login Flow", () => {
  test("should login with valid credentials", async ({ page }) => {
    // ✅ Set the global page first
    setPage(page);
    
    // ✅ Get Page Object instances using PageFactory getters
    const loginPage = getLoginPage();
    const homePage = getHomePage();
    
    // ✅ Use Page Objects in tests
    await loginPage.navigate();
    await loginPage.fillUsername("testuser");
    await loginPage.fillPassword("password123");
    await loginPage.clickLogin();
    
    // ✅ Navigate between pages using different Page Objects
    await homePage.waitForWelcomeMessage();
    
    expect(await homePage.isWelcomeVisible()).toBe(true);
  });
});
*/

/**
 * Example utility function - also correct usage
 */
export async function performLogin(username: string, password: string) {
  // ✅ CORRECT: Using PageFactory getters in utility functions
  const loginPage = getLoginPage();

  await loginPage.navigate();
  await loginPage.fillUsername(username);
  await loginPage.fillPassword(password);
  await loginPage.clickLogin();
}

/**
 * Example of using one Page Object from another (when needed)
 */
export class TestHelper {
  /**
   * ✅ This is acceptable - using PageFactory getters in helper classes
   */
  public async setupUserSession() {
    const loginPage = getLoginPage();
    const homePage = getHomePage();

    // Setup logic here
    await loginPage.navigate();
    // ... rest of setup
  }
}

// ✅ ARCHITECTURAL GUIDELINES:
// 1. Use PageFactory getters in: tests, utilities, helpers
// 2. Import 'page' directly in Page Objects for Playwright operations
// 3. Never import a Page Object's own getter within that Page Object
// 4. Use SnapWright commands to generate proper imports automatically
