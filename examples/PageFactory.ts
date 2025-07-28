import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { Page } from "playwright";

// Global page variable - set this in your test setup
export let page: Page;

// Singleton instances
let loginPageInstance: LoginPage | null = null;
let homePageInstance: HomePage | null = null;
let profilePageInstance: ProfilePage | null = null;

/**
 * Set the global page instance
 * Call this in your test setup before using any Page Objects
 */
export function setPage(pageInstance: Page): void {
  page = pageInstance;
}

/**
 * Get LoginPage instance (singleton)
 */
export function getLoginPage(pageInstance?: Page): LoginPage {
  if (!loginPageInstance) {
    loginPageInstance = new LoginPage();
  }
  if (pageInstance) {
    page = pageInstance;
  }
  return loginPageInstance;
}

/**
 * Get HomePage instance (singleton)
 */
export function getHomePage(pageInstance?: Page): HomePage {
  if (!homePageInstance) {
    homePageInstance = new HomePage();
  }
  if (pageInstance) {
    page = pageInstance;
  }
  return homePageInstance;
}

/**
 * Get ProfilePage instance (singleton)
 */
export function getProfilePage(pageInstance?: Page): ProfilePage {
  if (!profilePageInstance) {
    profilePageInstance = new ProfilePage();
  }
  if (pageInstance) {
    page = pageInstance;
  }
  return profilePageInstance;
}

// Reset all instances (useful for testing)
export function resetPageObjects(): void {
  loginPageInstance = null;
  homePageInstance = null;
  profilePageInstance = null;
}
