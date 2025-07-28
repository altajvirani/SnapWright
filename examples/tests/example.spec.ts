import { test, expect } from "@playwright/test";
import {
  setPage,
  getHomePage,
  getLoginPage,
  getProfilePage,
} from "../PageFactory";

/**
 * Example test file showing correct usage of SnapWright PageFactory
 *
 * ✅ This demonstrates the "Use Page Object from PageFactory" command
 * ✅ Shows proper architectural patterns without circular dependencies
 */

test.describe("HomePage Tests", () => {
  test("should load home page successfully", async ({ page }) => {
    // ✅ CORRECT: Set page context first
    setPage(page);

    // ✅ CORRECT: Use SnapWright-generated getter
    const homePage = getHomePage();

    // Use the page object
    await page.goto("/");
    // Add your test assertions here
  });

  test("should navigate between pages", async ({ page }) => {
    // ✅ CORRECT: Alternative pattern with page parameter
    const homePage = getHomePage(page);
    const profilePage = getProfilePage(page);

    await page.goto("/");
    // Navigate and test functionality
  });
});

test.describe("Login Flow", () => {
  test("should handle login process", async ({ page }) => {
    // ✅ CORRECT: Multiple page objects in same test
    const loginPage = getLoginPage(page);
    const homePage = getHomePage();

    await page.goto("/login");
    // Implement login flow
  });
});

/**
 * 💡 Key Points:
 *
 * ✅ Import getters from PageFactory (not Page Objects directly)
 * ✅ Use setPage() or pass page parameter
 * ✅ No circular dependencies
 * ✅ Follows SnapWright's architectural integrity
 */
