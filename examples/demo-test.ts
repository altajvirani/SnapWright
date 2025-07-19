/**
 * Demo Test File - Shows how to use the PageFactory and POM classes
 *
 * To use this demo:
 * 1. Run the extension (F5 in VS Code)
 * 2. Use "SnapWright: Create PageFactory" command
 * 3. Use "SnapWright: Add POM Classes to PageFactory" command and select the examples/pages directory
 * 4. Use the code snippets: pfinst, pfprop, etc.
 */

// Update the import path if PageFactory is located elsewhere, e.g.:
// Update the import path if PageFactory is located elsewhere, e.g.:
import { PageFactory } from "../src/PageFactory"; // <-- Update this path if needed
// If the file does not exist, create 'PageFactory.ts' in the correct directory.
// If the file does not exist, create 'PageFactory.ts' in the correct directory.

async function demonstratePageFactory() {
  // Using pfinst snippet - type 'pfinst' and press Tab
  const pageFactoryInstance = PageFactory.getInstance();

  // Using pfprop snippet - type 'pfprop' and press Tab
  const loginPage = PageFactory.getInstance().loginpage;
  const homePage = PageFactory.getInstance().homepage;
  const profilePage = PageFactory.getInstance().profilepage;

  // Example test flow
  console.log("=== Login Test Demo ===");
  await loginPage.login("testuser", "password123");

  console.log("=== Home Page Navigation Demo ===");
  await homePage.navigateToSection("dashboard");
  const isLoggedIn = await homePage.isLoggedIn();
  console.log("User is logged in:", isLoggedIn);

  console.log("=== Profile Update Demo ===");
  await profilePage.updateName("John Doe");
  await profilePage.updateEmail("john.doe@example.com");
  await profilePage.saveProfile();

  console.log("=== Search Demo ===");
  await homePage.search("test automation");
}

// Export the demo function
export { demonstratePageFactory };

// Type 'pomclass' and press Tab to create a new POM class template
