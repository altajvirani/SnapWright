// Example: POM with Page Parameter Pattern
// Generated when choosing "Accept page as parameter"

import { Page } from "@playwright/test";

export class LoginPage {
  // Page selectors, elements, and locators go here

  public constructor(private page: Page) {
    // Initialize page elements and setup
    // Use this.page for all page operations
  }

  // Add your page-specific methods here
  // Example:
  async clickLoginButton() {
    await this.page.click("#login-button");
  }

  async fillUsername(username: string) {
    await this.page.fill("#username", username);
  }
}
