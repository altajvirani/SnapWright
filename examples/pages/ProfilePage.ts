import { page } from "../PageFactory";

/**
 * ProfilePage - Page Object Model for user profile functionality
 * Demonstrates using the global page from PageFactory
 */
export class ProfilePage {
  private profilePictureSelector = ".profile-picture";
  private nameFieldSelector = "#name";
  private emailFieldSelector = "#email";
  private saveButtonSelector = "#save-profile";
  private profileFormSelector = "[data-testid='profile-form']";

  constructor() {
    // Initialize page elements and actions
  }

  /**
   * Navigate to profile page
   */
  public async navigate(): Promise<void> {
    // Using the global page from PageFactory
    await page.goto("/profile");
    await page.waitForSelector(this.profileFormSelector);
    console.log("Navigated to profile page");
  }

  /**
   * Update profile name
   */
  public async updateName(name: string): Promise<void> {
    // Using the global page from PageFactory
    await page.fill(this.nameFieldSelector, name);
    console.log(`Updated name to: ${name}`);
  }

  /**
   * Update email
   */
  public async updateEmail(email: string): Promise<void> {
    // Using the global page from PageFactory
    await page.fill(this.emailFieldSelector, email);
    console.log(`Updated email to: ${email}`);
  }

  /**
   * Save profile changes
   */
  public async saveProfile(): Promise<void> {
    // Using the global page from PageFactory
    await page.click(this.saveButtonSelector);
    await page.waitForSelector('[data-testid="success-message"]');
    console.log("Profile changes saved successfully");
  }

  /**
   * Upload profile picture
   */
  public async uploadProfilePicture(imagePath: string): Promise<void> {
    // Using the global page from PageFactory
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(imagePath);
    await page.waitForSelector('[data-testid="upload-success"]');
    console.log(`Profile picture uploaded: ${imagePath}`);
  }

  /**
   * Get current profile name
   */
  public async getCurrentName(): Promise<string> {
    // Using the global page from PageFactory
    const name = await page.inputValue(this.nameFieldSelector);
    console.log(`Current profile name: ${name}`);
    return name;
  }

  /**
   * Get current email
   */
  public async getCurrentEmail(): Promise<string> {
    // Using the global page from PageFactory
    const email = await page.inputValue(this.emailFieldSelector);
    console.log(`Current email: ${email}`);
    return email;
  }

  /**
   * Complete profile update
   */
  public async updateProfile(name: string, email: string): Promise<void> {
    await this.navigate();
    await this.updateName(name);
    await this.updateEmail(email);
    await this.saveProfile();
    console.log(`Profile updated: ${name}, ${email}`);
  }
}
