import { page } from "../PageFactory";

/**
 * LoginPage - Page Object Model for login functionality
 * Demonstrates using the global page from PageFactory
 */
export class LoginPage {
  private usernameSelector = "#username";
  private passwordSelector = "#password";
  private loginButtonSelector = "#login-btn";
  private loginFormSelector = "[data-testid='login-form']";

  constructor() {
    // Initialize page elements and actions
  }

  /**
   * Navigate to login page
   */
  public async navigate(): Promise<void> {
    // Using the global page from PageFactory
    await page.goto("/login");
    await page.waitForSelector(this.loginFormSelector);
    console.log("Navigated to login page");
  }

  /**
   * Enter username
   */
  public async enterUsername(username: string): Promise<void> {
    // Using the global page from PageFactory
    await page.fill(this.usernameSelector, username);
    console.log(`Entered username: ${username}`);
  }

  /**
   * Enter password
   */
  public async enterPassword(password: string): Promise<void> {
    // Using the global page from PageFactory
    await page.fill(this.passwordSelector, password);
    console.log("Entered password");
  }

  /**
   * Click login button
   */
  public async clickLogin(): Promise<void> {
    // Using the global page from PageFactory
    await page.click(this.loginButtonSelector);
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 5000 });
    console.log("Clicked login button and waited for dashboard");
  }

  /**
   * Perform complete login flow
   */
  public async login(username: string, password: string): Promise<void> {
    await this.navigate();
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
    console.log(`Login completed for user: ${username}`);
  }

  /**
   * Check if login form is visible
   */
  public async isLoginFormVisible(): Promise<boolean> {
    // Using the global page from PageFactory
    const isVisible = await page.locator(this.loginFormSelector).isVisible();
    console.log(`Login form visible: ${isVisible}`);
    return isVisible;
  }
}
