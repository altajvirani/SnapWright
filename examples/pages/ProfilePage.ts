// Import page from PageFactory for general page operations
import { page } from "../PageFactory";

/**
 * ⚠️  ARCHITECTURAL NOTE:
 * Do NOT import getProfilePage() from PageFactory in this file.
 * This would create a circular dependency. Use the SnapWright
 * command "Use Page Object from PageFactory" in test files instead.
 */

export class ProfilePage {
  // Page selectors, elements, and locators go here

  public constructor() {
    // Initialize page elements and setup
  }

  // Add your page-specific methods here
}
