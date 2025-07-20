import { page } from "../PageFactory";

/**
 * HomePage - Page Object Model for home page functionality
 * Demonstrates using the global page from PageFactory
 */
export class HomePage {
  private headerSelector = ".header";
  private navigationSelector = ".navigation";
  private searchBoxSelector = "#search";

  constructor() {
    // Initialize page elements and actions
  }

  /**
   * Navigate to a specific section
   */
  public async navigateToSection(section: string): Promise<void> {
    // Using the global page from PageFactory
    await page.click(`[data-section="${section}"]`);
    await page.waitForSelector(this.headerSelector);
    console.log(`Navigated to section: ${section}`);
  }

  /**
   * Perform search
   */
  public async search(query: string): Promise<void> {
    // Using the global page from PageFactory
    await page.fill(this.searchBoxSelector, query);
    await page.press(this.searchBoxSelector, "Enter");
    await page.waitForSelector('[data-testid="search-results"]');
    console.log(`Searched for: ${query}`);
  }

  /**
   * Check if user is logged in
   */
  public async isLoggedIn(): Promise<boolean> {
    // Using the global page from PageFactory
    const userMenu = await page
      .locator('[data-testid="user-menu"]')
      .isVisible();
    console.log(`Login status checked: ${userMenu}`);
    return userMenu;
  }

  /**
   * Navigate to homepage
   */
  public async navigate(): Promise<void> {
    // Using the global page from PageFactory
    await page.goto("/");
    await page.waitForSelector(this.headerSelector);
    console.log("Navigated to homepage");
  }
}
