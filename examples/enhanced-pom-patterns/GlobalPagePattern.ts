// Example: POM with Global Page Pattern
// Generated when choosing "Use global page from PageFactory"

// Import page from PageFactory for general page operations
import { page } from "../PageFactory";

export class LoginPage {
  // Page selectors, elements, and locators go here

  public constructor() {
    // Initialize page elements and setup
    // Use imported 'page' for all page operations
  }

  // Add your page-specific methods here
  // Example:
  async clickLoginButton() {
    await page.click("#login-button");
  }

  async fillUsername(username: string) {
    await page.fill("#username", username);
  }
}
