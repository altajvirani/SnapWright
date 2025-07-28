// ❌ THIS IS AN EXAMPLE OF WHAT NOT TO DO - CIRCULAR REFERENCE VIOLATION
import { page } from "../PageFactory";
import { getLoginPage } from "../PageFactory"; // ❌ CIRCULAR REFERENCE! LoginPage importing its own getter

/**
 * LoginPage - EXAMPLE OF CIRCULAR REFERENCE VIOLATION
 *
 * ⚠️  This file demonstrates what NOT to do:
 * - It imports getLoginPage() which creates a circular dependency
 * - SnapWright will prevent this and show warnings
 */
export class LoginPage {
  private usernameSelector = "#username";
  private passwordSelector = "#password";
  private loginButtonSelector = "#login-btn";
  private loginFormSelector = "[data-testid='login-form']";

  constructor() {
    // This is problematic - using getLoginPage() within LoginPage itself
    // This creates a circular reference!
  }

  /**
   * Example of problematic method that creates circular reference
   */
  public async someProblematicMethod(): Promise<void> {
    // ❌ DON'T DO THIS! This creates a circular reference
    const selfReference = getLoginPage(); // This is the same instance calling itself!

    // This pattern violates architectural integrity
    // Use SnapWright commands in test files instead
  }

  /**
   * ✅ CORRECT approach - use page directly from PageFactory
   */
  public async navigate(): Promise<void> {
    await page.goto("/login"); // ✅ This is correct
  }

  public async fillUsername(username: string): Promise<void> {
    await page.fill(this.usernameSelector, username); // ✅ This is correct
  }

  public async fillPassword(password: string): Promise<void> {
    await page.fill(this.passwordSelector, password); // ✅ This is correct
  }

  public async clickLogin(): Promise<void> {
    await page.click(this.loginButtonSelector); // ✅ This is correct
  }

  public async waitForForm(): Promise<void> {
    await page.waitForSelector(this.loginFormSelector); // ✅ This is correct
  }
}
