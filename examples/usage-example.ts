/**
 * SnapWright Usage Example
 */

import { type Page } from "@playwright/test";
import { pageFactory, setPage, getHomePage, getLoginPage } from "./PageFactory";

// Setup page in test
setPage(page);

// Use Page Objects
const homePage = getHomePage();
const loginPage = getLoginPage(page); // Optional page parameter

// Commands available:
// - SnapWright: Create PageFactory
// - SnapWright: Add Page Objects to Factory
// - SnapWright: Create Page Object Class
// - SnapWright: Use Page Object from PageFactory
