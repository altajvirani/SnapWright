import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Global variable to store extension context for state management
let extensionContext: vscode.ExtensionContext;

// Utility function for consistent PageFactory detection across the extension
function isPageFactoryFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf8");

    // Enhanced detection: Look for exact class name "PageFactory"
    const classPatterns = [
      /export\s+class\s+PageFactory\b/, // export class PageFactory
      /class\s+PageFactory\b/, // class PageFactory (any visibility)
      /export\s+default\s+class\s+PageFactory\b/, // export default class PageFactory
    ];

    // Also check for instance patterns (backward compatibility)
    const instancePatterns = [
      /PageFactory\.instance/, // PageFactory.instance
      /export\s+const\s+pageFactory/, // export const pageFactory
    ];

    return (
      classPatterns.some((pattern) => pattern.test(content)) ||
      instancePatterns.some((pattern) => pattern.test(content))
    );
  } catch (error) {
    // If we can't read the file, fall back to filename check as last resort
    return path.basename(filePath).toLowerCase().includes("pagefactory");
  }
}

// Configuration interface for dynamic settings
interface ExtensionConfig {
  fileExtensions: {
    pageObject: string;
    pageFactory: string;
    typescript: string;
  };
  namingConventions: {
    classSuffix: string;
    propertyPrefix: string;
    fileNameCase: "camelCase" | "kebab-case" | "snake_case";
  };
  templates: {
    pageFactory: string;
    pageObjectClass: string;
  };
  validation: {
    classNamePattern: string;
    fileNamePattern: string;
    preventNesting: boolean;
  };
  importPaths: {
    defaultPrefix: string;
    useRelativePaths: boolean;
  };
}

// Get dynamic configuration from VS Code settings or defaults
function getExtensionConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration("snapwright");

  return {
    fileExtensions: {
      pageObject: config.get("fileExtensions.pageObject", ".page.ts"),
      pageFactory: config.get("fileExtensions.pageFactory", ".ts"),
      typescript: config.get("fileExtensions.typescript", ".ts"),
    },
    namingConventions: {
      classSuffix: config.get("namingConventions.classSuffix", "Page"),
      propertyPrefix: config.get("namingConventions.propertyPrefix", "_"),
      fileNameCase: config.get("namingConventions.fileNameCase", "camelCase"),
    },
    templates: {
      pageFactory: config.get("templates.pageFactory", ""),
      pageObjectClass: config.get("templates.pageObjectClass", ""),
    },
    validation: {
      classNamePattern: config.get(
        "validation.classNamePattern",
        "^[a-zA-Z][a-zA-Z0-9]*$"
      ),
      fileNamePattern: config.get(
        "validation.fileNamePattern",
        "^[a-zA-Z][a-zA-Z0-9]*$"
      ),
      preventNesting: config.get("validation.preventNesting", true),
    },
    importPaths: {
      defaultPrefix: config.get("importPaths.defaultPrefix", "./"),
      useRelativePaths: config.get("importPaths.useRelativePaths", true),
    },
  };
}

export function activate(context: vscode.ExtensionContext) {
  console.log("SnapWright extension is now active!");

  // Store context for state management
  extensionContext = context;

  // Register command to create PageFactory
  let createPageFactoryCommand = vscode.commands.registerCommand(
    "snapwright.createPageFactory",
    async () => {
      await createPageFactory();
    }
  );

  // Register command to add Page Object classes to PageFactory
  let addPageObjectToFactoryCommand = vscode.commands.registerCommand(
    "snapwright.addPageObjectToFactory",
    async () => {
      await addPageObjectToFactory();
    }
  );

  // Register command to create Page Object class
  let createPageObjectClassCommand = vscode.commands.registerCommand(
    "snapwright.createPageObjectClass",
    async () => {
      await createPageObjectClass();
    }
  );

  // Register command to use Page Object from PageFactory
  let usePageObjectFromFactoryCommand = vscode.commands.registerCommand(
    "snapwright.usePageObjectFromFactory",
    async () => {
      await usePageObjectFromFactory();
    }
  );

  // Register command to remove Page Object from PageFactory
  let removePageObjectFromFactoryCommand = vscode.commands.registerCommand(
    "snapwright.removePageObjectFromFactory",
    async () => {
      await removePageObjectFromFactory();
    }
  );

  // Register command to delete PageFactory
  let deletePageFactoryCommand = vscode.commands.registerCommand(
    "snapwright.deletePageFactory",
    async () => {
      await deletePageFactory();
    }
  );

  // Register command to cleanup orphaned Page Objects
  let cleanupOrphanedPageObjectsCommand = vscode.commands.registerCommand(
    "snapwright.cleanupOrphanedPageObjects",
    async () => {
      await cleanupOrphanedPageObjects();
    }
  );

  // Register command to delete Page Object
  let deletePageObjectCommand = vscode.commands.registerCommand(
    "snapwright.deletePageObject",
    async () => {
      await deletePageObject();
    }
  );

  context.subscriptions.push(createPageFactoryCommand);
  context.subscriptions.push(addPageObjectToFactoryCommand);
  context.subscriptions.push(createPageObjectClassCommand);
  context.subscriptions.push(usePageObjectFromFactoryCommand);
  context.subscriptions.push(removePageObjectFromFactoryCommand);
  context.subscriptions.push(deletePageFactoryCommand);
  context.subscriptions.push(cleanupOrphanedPageObjectsCommand);
  context.subscriptions.push(deletePageObjectCommand);
}

// Helper function to check for PageFactory nesting
function checkForPageFactoryNesting(selectedPath: string): {
  hasParentPageFactory: boolean;
  hasChildPageFactory: boolean;
  parentPath?: string;
  childPath?: string;
} {
  const extensionConfig = getExtensionConfig();

  // Helper function to check if a file is PageFactory by content
  function isPageFactoryByContent(filePath: string): boolean {
    return isPageFactoryFile(filePath);
  }

  // Check for parent PageFactory by walking up the directory tree
  let currentPath = path.dirname(selectedPath);
  let hasParentPageFactory = false;
  let parentPath: string | undefined;

  while (currentPath !== path.dirname(currentPath)) {
    // Stop at root
    const items = fs.readdirSync(currentPath);
    const pageFactoryFile = items.find(
      (item) =>
        item.endsWith(extensionConfig.fileExtensions.typescript) &&
        isPageFactoryByContent(path.join(currentPath, item))
    );

    if (pageFactoryFile) {
      hasParentPageFactory = true;
      parentPath = path.join(currentPath, pageFactoryFile);
      break;
    }

    currentPath = path.dirname(currentPath);
  }

  // Check for child PageFactory by walking down the directory tree
  let hasChildPageFactory = false;
  let childPath: string | undefined;

  function walkDown(dirPath: string): boolean {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (
          stat.isDirectory() &&
          !item.startsWith(".") &&
          item !== "node_modules"
        ) {
          // Check if this directory contains a PageFactory
          const subItems = fs.readdirSync(fullPath);
          const pageFactoryFile = subItems.find(
            (subItem) =>
              subItem.endsWith(extensionConfig.fileExtensions.typescript) &&
              isPageFactoryByContent(path.join(fullPath, subItem))
          );

          if (pageFactoryFile) {
            childPath = path.join(fullPath, pageFactoryFile);
            return true;
          }

          // Recursively check subdirectories
          if (walkDown(fullPath)) {
            return true;
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }

    return false;
  }

  hasChildPageFactory = walkDown(selectedPath);

  return {
    hasParentPageFactory,
    hasChildPageFactory,
    parentPath,
    childPath,
  };
}

async function createPageFactory(
  openFileAfterCreation: boolean = true
): Promise<string | undefined> {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return undefined;
    }

    // Step 1: Show directory picker for PageFactory location
    const selectedFolder = await selectDirectory(workspaceFolders[0].uri);
    if (!selectedFolder) {
      return undefined;
    }

    // Get extension configuration for validation
    const extensionConfig = getExtensionConfig();

    // Step 1.5: Check for PageFactory nesting
    if (extensionConfig.validation.preventNesting) {
      const nestingCheck = checkForPageFactoryNesting(selectedFolder.fsPath);

      if (nestingCheck.hasParentPageFactory) {
        const relativePath = path.relative(
          workspaceFolders[0].uri.fsPath,
          nestingCheck.parentPath!
        );
        const action = await vscode.window.showWarningMessage(
          `A PageFactory already exists in a parent directory at "${relativePath}". Creating nested PageFactories may cause confusion.\n\nDo you want to continue anyway?`,
          "Continue Anyway",
          "Choose Different Location",
          "Cancel"
        );

        if (action === "Cancel") {
          return undefined;
        } else if (action === "Choose Different Location") {
          // Recursively call the function to let user choose again
          return await createPageFactory();
        }
        // If "Continue Anyway", proceed with creation
      }

      if (nestingCheck.hasChildPageFactory) {
        const relativePath = path.relative(
          workspaceFolders[0].uri.fsPath,
          nestingCheck.childPath!
        );
        const action = await vscode.window.showWarningMessage(
          `A PageFactory already exists in a subdirectory at "${relativePath}". Creating a parent PageFactory over existing ones may cause confusion.\n\nDo you want to continue anyway?`,
          "Continue Anyway",
          "Choose Different Location",
          "Cancel"
        );

        if (action === "Cancel") {
          return undefined;
        } else if (action === "Choose Different Location") {
          // Recursively call the function to let user choose again
          return await createPageFactory();
        }
        // If "Continue Anyway", proceed with creation
      }
    }

    // Step 2: Get user-defined name for the PageFactory
    let pageFactoryName: string | undefined;
    let isValidName = false;

    while (!isValidName) {
      pageFactoryName = await vscode.window.showInputBox({
        prompt: `Enter a unique name for your PageFactory`,
        placeHolder: `e.g., MainPageFactory, TestPageFactory`,
        validateInput: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "PageFactory name cannot be empty";
          }
          const pattern = new RegExp(
            extensionConfig.validation.classNamePattern
          );
          if (!pattern.test(value.trim())) {
            return "PageFactory name must match the configured pattern";
          }
          return null;
        },
      });

      if (!pageFactoryName) {
        return undefined; // User cancelled
      }

      pageFactoryName = pageFactoryName.trim();

      // Step 3: Validate uniqueness in directory only
      const pageFactoryPath = path.join(
        selectedFolder.fsPath,
        `${pageFactoryName}${extensionConfig.fileExtensions.pageFactory}`
      );

      if (fs.existsSync(pageFactoryPath)) {
        const action = await vscode.window.showWarningMessage(
          `A PageFactory named "${pageFactoryName}${extensionConfig.fileExtensions.pageFactory}" already exists in this directory. Please choose a different name or overwrite the existing file.`,
          "Choose Different Name",
          "Overwrite Existing",
          "Cancel"
        );

        if (action === "Cancel") {
          return undefined;
        } else if (action === "Overwrite Existing") {
          isValidName = true;
        }
        // If "Choose Different Name", continue the loop
      } else {
        // No file conflict, name is valid
        isValidName = true;
      }
    }

    const pageFactoryPath = path.join(
      selectedFolder.fsPath,
      `${pageFactoryName}${extensionConfig.fileExtensions.pageFactory}`
    );

    // Step 5: Create PageFactory template
    const pageFactoryTemplate = generatePageFactoryTemplate();

    // Write file
    fs.writeFileSync(pageFactoryPath, pageFactoryTemplate);

    // Step 6: Save to persistent storage
    await addPageFactoryPath(pageFactoryPath, pageFactoryName);

    // Conditionally open the created file
    if (openFileAfterCreation) {
      const document = await vscode.workspace.openTextDocument(pageFactoryPath);
      await vscode.window.showTextDocument(document);
    }

    vscode.window.showInformationMessage(
      `PageFactory "${pageFactoryName}${extensionConfig.fileExtensions.pageFactory}" created successfully and saved to your PageFactory list!`
    );

    // Return the path of the created PageFactory
    return pageFactoryPath;
  } catch (error) {
    vscode.window.showErrorMessage(`Error creating PageFactory: ${error}`);
    return undefined;
  }
}

async function addPageObjectToFactory() {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Select PageFactory using the new path management system
    const pageFactoryPath = await selectPageFactoryPath();
    if (!pageFactoryPath) {
      return; // User cancelled selection
    }

    // Show directory picker for Page Object classes
    const selectedFolder = await selectDirectory(workspaceFolders[0].uri);
    if (!selectedFolder) {
      return;
    }

    // Find TypeScript files in the selected directory
    const tsFiles = findTSFiles(selectedFolder.fsPath);

    if (tsFiles.length === 0) {
      vscode.window.showWarningMessage(
        "No TypeScript files found in the selected directory"
      );
      return;
    }

    // Get file information with stats for sorting
    const extensionConfig = getExtensionConfig();
    const fileInfos = tsFiles.map((file) => {
      try {
        const stats = fs.statSync(file);
        const fileContent = fs.readFileSync(file, "utf8");
        const classMatch = fileContent.match(/export\s+class\s+(\w+)/);
        const className = classMatch
          ? classMatch[1]
          : path.basename(file, extensionConfig.fileExtensions.typescript);

        return {
          filePath: file,
          className: className,
          modifiedTime: stats.mtime,
          createdTime: stats.birthtime,
          stats: stats,
        };
      } catch (error) {
        // Fallback for files that can't be read
        const stats = fs.statSync(file);
        return {
          filePath: file,
          className: path.basename(
            file,
            extensionConfig.fileExtensions.typescript
          ),
          modifiedTime: stats.mtime,
          createdTime: stats.birthtime,
          stats: stats,
        };
      }
    });

    // Show sorting options first (with remembered preference)
    const lastSortOption = extensionContext.globalState.get<string>(
      "snapwright.lastSortOption",
      "modified-desc"
    );

    const sortOptions = [
      {
        label: "$(clock) Modified Time (Latest First)",
        description: "Sort by modification time, newest first",
        value: "modified-desc",
      },
      {
        label: "$(clock) Modified Time (Oldest First)",
        description: "Sort by modification time, oldest first",
        value: "modified-asc",
      },
      {
        label: "$(calendar) Created Time (Latest First)",
        description: "Sort by creation time, newest first",
        value: "created-desc",
      },
      {
        label: "$(calendar) Created Time (Oldest First)",
        description: "Sort by creation time, oldest first",
        value: "created-asc",
      },
      {
        label: "$(symbol-string) Alphabetical (A-Z)",
        description: "Sort by class name alphabetically",
        value: "name-asc",
      },
      {
        label: "$(symbol-string) Alphabetical (Z-A)",
        description: "Sort by class name reverse alphabetically",
        value: "name-desc",
      },
    ];

    // Mark the last used option
    const defaultOption = sortOptions.find(
      (opt) => opt.value === lastSortOption
    );
    if (defaultOption) {
      defaultOption.description += " (Last used)";
    }

    const sortOption = await vscode.window.showQuickPick(sortOptions, {
      placeHolder: "Choose how to sort the Page Object classes",
      title: "Sort Options",
    });

    if (!sortOption) {
      return; // User cancelled
    }

    // Remember the user's choice
    await extensionContext.globalState.update(
      "snapwright.lastSortOption",
      sortOption.value
    );

    // Sort the files based on selected option
    switch (sortOption.value) {
      case "modified-desc":
        fileInfos.sort(
          (a, b) => b.modifiedTime.getTime() - a.modifiedTime.getTime()
        );
        break;
      case "modified-asc":
        fileInfos.sort(
          (a, b) => a.modifiedTime.getTime() - b.modifiedTime.getTime()
        );
        break;
      case "created-desc":
        fileInfos.sort(
          (a, b) => b.createdTime.getTime() - a.createdTime.getTime()
        );
        break;
      case "created-asc":
        fileInfos.sort(
          (a, b) => a.createdTime.getTime() - b.createdTime.getTime()
        );
        break;
      case "name-asc":
        fileInfos.sort((a, b) => a.className.localeCompare(b.className));
        break;
      case "name-desc":
        fileInfos.sort((a, b) => b.className.localeCompare(a.className));
        break;
    }

    // Create formatted display with time information
    const formatTime = (date: Date) => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
      } else if (diffHours < 24) {
        return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
      } else if (diffDays < 7) {
        return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    };

    // Let user select which Page Object classes to add
    const selectedFiles = await vscode.window.showQuickPick(
      fileInfos.map((fileInfo) => {
        const modifiedTimeStr = formatTime(fileInfo.modifiedTime);
        const createdTimeStr = formatTime(fileInfo.createdTime);

        let detail = `File: ${path.basename(fileInfo.filePath)}`;
        if (sortOption.value.startsWith("modified")) {
          detail += ` • Modified: ${modifiedTimeStr}`;
        } else if (sortOption.value.startsWith("created")) {
          detail += ` • Created: ${createdTimeStr}`;
        } else {
          detail += ` • Modified: ${modifiedTimeStr}`;
        }

        return {
          label: fileInfo.className,
          description: fileInfo.filePath,
          detail: detail,
          picked: true,
        };
      }),
      {
        canPickMany: true,
        placeHolder: `Select Page Object classes to add to PageFactory (${
          fileInfos.length
        } files found, sorted by ${sortOption.label.replace(
          /\$\([^)]+\)\s*/,
          ""
        )})`,
        title: "Select Page Objects",
      }
    );

    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    // Update PageFactory with selected Page Object classes
    await updatePageFactory(pageFactoryPath, selectedFiles);

    vscode.window.showInformationMessage(
      `Added ${selectedFiles.length} Page Object class(es) to PageFactory!`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error adding Page Object classes: ${error}`
    );
  }
}

// Enhanced version of addPageObjectToFactory that pre-selects a specific POM file
async function addPageObjectToFactoryWithPreselection(
  preselectedFilePath: string,
  preselectedClassName: string
) {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Select PageFactory using the path management system
    const pageFactoryPath = await selectPageFactoryPath();
    console.log("Selected PageFactory path:", pageFactoryPath);

    if (!pageFactoryPath) {
      console.log("No PageFactory path selected, cancelling injection");
      return; // User cancelled selection
    }

    // Validate paths before using them
    if (!preselectedFilePath || !pageFactoryPath) {
      console.error(
        "Invalid paths - preselectedFilePath:",
        preselectedFilePath,
        "pageFactoryPath:",
        pageFactoryPath
      );
      vscode.window.showErrorMessage(
        "Invalid file paths. Cannot add POM to PageFactory."
      );
      return;
    }

    // Confirm adding the specific POM to the selected PageFactory
    const relativePath = path.relative(
      workspaceFolders[0].uri.fsPath,
      preselectedFilePath
    );
    const pfRelativePath = path.relative(
      workspaceFolders[0].uri.fsPath,
      pageFactoryPath
    );

    const confirmAdd = await vscode.window.showInformationMessage(
      `Add ${preselectedClassName} (${relativePath}) to PageFactory (${pfRelativePath})?`,
      "Yes, Add",
      "Cancel"
    );

    if (confirmAdd !== "Yes, Add") {
      return;
    }

    // Create file info for the pre-selected file
    let stats;
    try {
      stats = fs.statSync(preselectedFilePath);
    } catch (statError) {
      console.error(
        "Error getting file stats for:",
        preselectedFilePath,
        statError
      );
      vscode.window.showErrorMessage(
        `Cannot access POM file: ${preselectedFilePath}`
      );
      return;
    }

    const selectedFiles = [
      {
        filePath: preselectedFilePath,
        description: preselectedFilePath, // updatePageFactory expects this property
        label: preselectedClassName,
        className: preselectedClassName,
        modifiedTime: stats.mtime,
        createdTime: stats.birthtime,
        stats: stats,
      },
    ];

    console.log(
      "About to update PageFactory:",
      pageFactoryPath,
      "with files:",
      selectedFiles
    );

    // Update PageFactory with the pre-selected Page Object
    await updatePageFactory(pageFactoryPath, selectedFiles);

    vscode.window.showInformationMessage(
      `Successfully added ${preselectedClassName} to PageFactory!`
    );
  } catch (error) {
    console.error("Error adding Page Object to Factory:", error);
    vscode.window.showErrorMessage(
      `Error adding Page Object to PageFactory: ${error}`
    );
  }
}

// Version that directly uses a known PageFactory path (for seamless workflow)
async function addPageObjectToFactoryWithKnownPath(
  preselectedFilePath: string,
  preselectedClassName: string,
  knownPageFactoryPath: string
) {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Validate paths before using them
    if (!preselectedFilePath || !knownPageFactoryPath) {
      console.error(
        "Invalid paths - preselectedFilePath:",
        preselectedFilePath,
        "knownPageFactoryPath:",
        knownPageFactoryPath
      );
      vscode.window.showErrorMessage(
        "Invalid file paths. Cannot add POM to PageFactory."
      );
      return;
    }

    // Confirm adding the specific POM to the known PageFactory
    const relativePath = path.relative(
      workspaceFolders[0].uri.fsPath,
      preselectedFilePath
    );
    const pfRelativePath = path.relative(
      workspaceFolders[0].uri.fsPath,
      knownPageFactoryPath
    );

    const confirmAdd = await vscode.window.showInformationMessage(
      `Add ${preselectedClassName} (${relativePath}) to the newly created PageFactory (${pfRelativePath})?`,
      "Yes, Add",
      "Cancel"
    );

    if (confirmAdd !== "Yes, Add") {
      return;
    }

    // Create file info for the pre-selected file
    let stats;
    try {
      stats = fs.statSync(preselectedFilePath);
    } catch (statError) {
      console.error(
        "Error getting file stats for:",
        preselectedFilePath,
        statError
      );
      vscode.window.showErrorMessage(
        `Cannot access POM file: ${preselectedFilePath}`
      );
      return;
    }

    const selectedFiles = [
      {
        filePath: preselectedFilePath,
        description: preselectedFilePath, // updatePageFactory expects this property
        label: preselectedClassName,
        className: preselectedClassName,
        modifiedTime: stats.mtime,
        createdTime: stats.birthtime,
        stats: stats,
      },
    ];

    console.log(
      "About to update known PageFactory:",
      knownPageFactoryPath,
      "with files:",
      selectedFiles
    );

    // Update PageFactory with the pre-selected Page Object
    await updatePageFactory(knownPageFactoryPath, selectedFiles);

    vscode.window.showInformationMessage(
      `Successfully added ${preselectedClassName} to PageFactory!`
    );
  } catch (error) {
    console.error("Error adding Page Object to known PageFactory:", error);
    vscode.window.showErrorMessage(
      `Error adding Page Object to PageFactory: ${error}`
    );
  }
}

async function selectDirectory(
  workspaceUri: vscode.Uri
): Promise<vscode.Uri | undefined> {
  const options: vscode.OpenDialogOptions = {
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    defaultUri: workspaceUri,
    openLabel: "Select Directory",
  };

  const folderUri = await vscode.window.showOpenDialog(options);
  return folderUri ? folderUri[0] : undefined;
}

function findTSFiles(dirPath: string): string[] {
  const files: string[] = [];
  const extensionConfig = getExtensionConfig();

  function walkDir(currentPath: string) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (
        item.endsWith(extensionConfig.fileExtensions.typescript) &&
        !isPageFactoryFile(fullPath) &&
        (item.endsWith(extensionConfig.fileExtensions.pageObject) ||
          (!extensionConfig.fileExtensions.pageObject.includes(".")
            ? true
            : !item.includes(
                extensionConfig.fileExtensions.pageObject.replace(
                  extensionConfig.fileExtensions.typescript,
                  ""
                )
              )))
      ) {
        files.push(fullPath);
      }
    }
  }

  walkDir(dirPath);
  return files;
}

async function findPageFactory(
  workspacePath: string
): Promise<string | undefined> {
  const files: string[] = [];
  const extensionConfig = getExtensionConfig();

  function walkDir(currentPath: string) {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (
          stat.isDirectory() &&
          !item.startsWith(".") &&
          item !== "node_modules"
        ) {
          walkDir(fullPath);
        } else if (
          item.endsWith(extensionConfig.fileExtensions.typescript) &&
          isPageFactoryFile(fullPath)
        ) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  walkDir(workspacePath);
  return files.length > 0 ? files[0] : undefined;
}

function generatePageFactoryTemplate(): string {
  const extensionConfig = getExtensionConfig();

  // Use custom template if provided, otherwise use default
  if (extensionConfig.templates.pageFactory) {
    return extensionConfig.templates.pageFactory;
  }

  return `import { type Page } from "@playwright/test";

/**
 * PageFactory - Singleton class for managing Page Object instances
 * Generated by SnapWright
 */
class PageFactory {
  private static _instance: PageFactory;
  private _globalPage: Page;

  private constructor() {}

  private static setInstance() {
    PageFactory._instance = new PageFactory();
  }

  public static get instance() {
    if (!PageFactory._instance) PageFactory.setInstance();

    return PageFactory._instance;
  }

  public setPage(page: Page) {
    this._globalPage = page;
  }

  public get page(): Page {
    if (!this._globalPage)
      throw new Error("Page not set. Use setPage(page) first.");

    return this._globalPage;
  }

  private ensurePageSet(page?: Page): void {
    if (!this._globalPage) {
      if (!page)
        throw new Error("Page not set. Use setPage(page) first.");
      this.setPage(page);
    }
  }

  // Page Object class properties will be added here
}

export const pageFactory = PageFactory.instance;
export const setPage = PageFactory.instance.setPage;
export const page = PageFactory.instance.page;
`;
}

async function updatePageFactory(
  pageFactoryPath: string,
  selectedFiles: any[]
) {
  let content = fs.readFileSync(pageFactoryPath, "utf8");

  // Parse existing content to detect duplicates
  const existingImports = extractExistingImports(content);
  const existingProperties = extractExistingProperties(content);

  // Generate imports, properties, getters, and exports only for new classes
  const imports: string[] = [];
  const properties: string[] = [];
  const getters: string[] = [];
  const exports: string[] = [];
  const skippedClasses: string[] = [];

  for (const file of selectedFiles) {
    // Extract class name from file content instead of filename
    const fileContent = fs.readFileSync(file.description, "utf8");
    const classMatch = fileContent.match(/export\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : file.label;

    const relativePath = path.relative(
      path.dirname(pageFactoryPath),
      file.description
    );
    const extensionConfig = getExtensionConfig();
    const importPath = relativePath
      .replace(/\\/g, "/")
      .replace(extensionConfig.fileExtensions.typescript, "");

    // Generate import path based on configuration
    const finalImportPath = extensionConfig.importPaths.useRelativePaths
      ? importPath.startsWith(".")
        ? importPath
        : `${extensionConfig.importPaths.defaultPrefix}${importPath}`
      : importPath;

    const importStatement = `import { ${className} } from '${finalImportPath}';`;
    const propertyName = `${
      extensionConfig.namingConventions.propertyPrefix
    }${classNameToPropertyCase(className)}`;
    const getterName = classNameToPropertyCase(className);

    // Check if import already exists
    if (
      existingImports.includes(importStatement) ||
      existingImports.some((imp) => imp.includes(`{ ${className} }`))
    ) {
      skippedClasses.push(className);
      continue;
    }

    // Check if property already exists
    if (existingProperties.includes(propertyName)) {
      skippedClasses.push(className);
      continue;
    }

    imports.push(importStatement);
    properties.push(`  private ${propertyName}: ${className};`);
    getters.push(`  public get${className}(page?: Page): ${className} {
    this.ensurePageSet(page);
    if (!this.${propertyName}) this.${propertyName} = new ${className}();
    return this.${propertyName};
  }`);
    exports.push(
      `export const get${className} = PageFactory.instance.get${className};`
    );
  }

  // Show user which classes were skipped
  if (skippedClasses.length > 0) {
    vscode.window.showInformationMessage(
      `Skipped ${
        skippedClasses.length
      } class(es) that already exist: ${skippedClasses.join(", ")}`
    );
  }

  // Only proceed if there are new classes to add
  if (imports.length === 0) {
    vscode.window.showInformationMessage(
      "All selected classes already exist in PageFactory"
    );
    return;
  }

  // Add imports at the top (after existing imports)
  if (imports.length > 0) {
    const lastImportIndex = findLastImportIndex(content);
    if (lastImportIndex !== -1) {
      const beforeImports = content.substring(0, lastImportIndex);
      const afterImports = content.substring(lastImportIndex);
      content = beforeImports + imports.join("\n") + "\n" + afterImports;
    } else {
      // No existing imports, add at the top
      content = imports.join("\n") + "\n\n" + content;
    }
  }

  // Add properties with clean formatting
  if (properties.length > 0) {
    // Simple approach: find _globalPage and insert after it
    const lines = content.split("\n");
    let globalPageIndex = -1;
    let lastPageObjectIndex = -1;

    // Find _globalPage and any existing Page Object properties
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes("private _globalPage: Page;")) {
        globalPageIndex = i;
      }
      if (
        line.startsWith("private _") &&
        !line.includes("_globalPage") &&
        !line.includes("_instance")
      ) {
        lastPageObjectIndex = i;
      }
    }

    if (lastPageObjectIndex !== -1) {
      // Insert after last existing Page Object property
      lines.splice(lastPageObjectIndex + 1, 0, ...properties);
    } else if (globalPageIndex !== -1) {
      // Insert after _globalPage - add blank line first, then properties
      lines.splice(globalPageIndex + 1, 0, "", ...properties);
    }

    content = lines.join("\n");
  }

  // Add getters before the comment line
  if (getters.length > 0) {
    const commentIndex = content.indexOf(
      "// Page Object class properties will be added here"
    );
    if (commentIndex !== -1) {
      const beforeComment = content.substring(0, commentIndex);
      const afterComment = content.substring(commentIndex);
      content = beforeComment + getters.join("\n\n") + "\n\n" + afterComment;
    } else {
      // Fallback: add before the last closing brace
      const lastBraceIndex = content.lastIndexOf("}");
      if (lastBraceIndex !== -1) {
        const beforeLastBrace = content.substring(0, lastBraceIndex);
        const afterLastBrace = content.substring(lastBraceIndex);
        content = beforeLastBrace + getters.join("\n") + "\n" + afterLastBrace;
      }
    }
  }

  // Add exports at the end of the file
  if (exports.length > 0) {
    content = content + "\n" + exports.join("\n");
  }

  // Write updated content
  fs.writeFileSync(pageFactoryPath, content);

  // Open the updated file
  const document = await vscode.workspace.openTextDocument(pageFactoryPath);
  await vscode.window.showTextDocument(document);

  vscode.window.showInformationMessage(
    `Successfully added ${imports.length} new Page Object class(es) to PageFactory!`
  );
}

// Helper function to extract existing imports
function extractExistingImports(content: string): string[] {
  const importRegex = /^import\s+.*$/gm;
  const matches = content.match(importRegex);
  return matches || [];
}

// Helper function to extract existing properties
function extractExistingProperties(content: string): string[] {
  const propertyRegex = /private\s+(_\w+):/g;
  const properties: string[] = [];
  let match;
  while ((match = propertyRegex.exec(content)) !== null) {
    properties.push(match[1]);
  }
  return properties;
}

// Helper function to find the last import statement index
function findLastImportIndex(content: string): number {
  const lines = content.split("\n");
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("import ")) {
      lastImportIndex = content.indexOf(lines[i]) + lines[i].length + 1;
    }
  }

  return lastImportIndex;
}

// New function for smart PageFactory instance creation
async function createPageFactoryInstance() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found");
    return;
  }

  const document = editor.document;
  const content = document.getText();

  // Check if PageFactory is already imported
  const hasPageFactoryImport =
    content.includes("import") &&
    (content.includes("pageFactory") || content.includes("{ pageFactory }"));

  let textToInsert = "";

  // Add import if not present
  if (!hasPageFactoryImport) {
    // Use the new path management system to find PageFactory
    const pageFactoryPath = await findPageFactoryRelativePath(
      document.uri.fsPath
    );
    if (pageFactoryPath) {
      textToInsert += `import { getDynamicPage } from '${pageFactoryPath}';\n\n`;
    } else {
      textToInsert += `import { getDynamicPage } from './PageFactory';\n\n`;
    }
  }

  // Add example usage with new pattern
  textToInsert += `// Option 1: Pass page for explicit page setting
await getDynamicPage(page).navigate();

// Option 2: Use without page if already set
await getDynamicPage().performAction();`;

  // Insert at cursor position
  const position = editor.selection.active;
  await editor.edit((editBuilder: vscode.TextEditorEdit) => {
    editBuilder.insert(position, textToInsert);
  });
}

// Helper function to find PageFactory relative path
async function findPageFactoryRelativePath(
  currentFilePath: string
): Promise<string | null> {
  // Try to get saved PageFactory paths first
  const savedPaths = await getSavedPageFactoryPaths();

  if (savedPaths.length > 0) {
    // Use the first saved path (most recently used)
    const pageFactoryPath = savedPaths[0].path;
    const extensionConfig = getExtensionConfig();
    const relativePath = path.relative(
      path.dirname(currentFilePath),
      pageFactoryPath
    );
    return relativePath
      .replace(/\\/g, "/")
      .replace(extensionConfig.fileExtensions.pageFactory, "");
  }

  // Fallback to old method if no saved paths
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return null;

  const pageFactoryPath = await findPageFactory(workspaceFolders[0].uri.fsPath);
  if (!pageFactoryPath) return null;

  const extensionConfig = getExtensionConfig();
  const relativePath = path.relative(
    path.dirname(currentFilePath),
    pageFactoryPath
  );
  return relativePath
    .replace(/\\/g, "/")
    .replace(extensionConfig.fileExtensions.pageFactory, "");
}

// Helper function to convert class name to the configured naming convention
function classNameToPropertyCase(className: string): string {
  const extensionConfig = getExtensionConfig();
  const baseCase = className.charAt(0).toLowerCase() + className.slice(1);

  switch (extensionConfig.namingConventions.fileNameCase) {
    case "kebab-case":
      return baseCase.replace(/([A-Z])/g, "-$1").toLowerCase();
    case "snake_case":
      return baseCase.replace(/([A-Z])/g, "_$1").toLowerCase();
    case "camelCase":
    default:
      return baseCase;
  }
}

// Helper function to process class name and generate filename
function processClassAndFileName(userInput: string): {
  className: string;
  fileName: string;
} {
  const trimmedInput = userInput.trim();
  const extensionConfig = getExtensionConfig();
  const suffix = extensionConfig.namingConventions.classSuffix;

  // Check if input already ends with the configured suffix
  const endsWithSuffix = trimmedInput
    .toLowerCase()
    .endsWith(suffix.toLowerCase());

  // Generate class name (always ends with configured suffix)
  const className = endsWithSuffix ? trimmedInput : trimmedInput + suffix;

  // Generate filename (remove suffix if present, convert to configured case, add page object extension)
  let baseFileName;
  if (endsWithSuffix) {
    // Remove suffix from the end
    baseFileName = trimmedInput.slice(0, -suffix.length);
  } else {
    baseFileName = trimmedInput;
  }

  // Convert to configured case for filename
  let finalFileName;
  switch (extensionConfig.namingConventions.fileNameCase) {
    case "kebab-case":
      finalFileName = baseFileName.replace(/([A-Z])/g, (match, letter, index) =>
        index === 0 ? letter.toLowerCase() : "-" + letter.toLowerCase()
      );
      break;
    case "snake_case":
      finalFileName = baseFileName.replace(/([A-Z])/g, (match, letter, index) =>
        index === 0 ? letter.toLowerCase() : "_" + letter.toLowerCase()
      );
      break;
    case "camelCase":
    default:
      finalFileName =
        baseFileName.charAt(0).toLowerCase() + baseFileName.slice(1);
      break;
  }

  const fileName = `${finalFileName}${extensionConfig.fileExtensions.pageObject}`;

  return { className, fileName };
}

// Function to create a new Page Object class
async function createPageObjectClass() {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Show directory picker
    const selectedFolder = await selectDirectory(workspaceFolders[0].uri);
    if (!selectedFolder) {
      return;
    }

    // Get class name from user
    const extensionConfig = getExtensionConfig();
    const userInput = await vscode.window.showInputBox({
      prompt: `Enter the Page Object class name (e.g., Home, Login, Home${extensionConfig.namingConventions.classSuffix}, Login${extensionConfig.namingConventions.classSuffix})`,
      placeHolder: "Home",
      validateInput: (value: string) => {
        if (!value || value.trim() === "") {
          return "Class name cannot be empty";
        }
        const pattern = new RegExp(extensionConfig.validation.classNamePattern);
        if (!pattern.test(value)) {
          return "Class name must match the configured pattern";
        }
        return null;
      },
    });

    if (!userInput) {
      return;
    }

    // Process class name and filename
    const { className, fileName } = processClassAndFileName(userInput);
    const filePath = path.join(selectedFolder.fsPath, fileName);

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      vscode.window.showErrorMessage(`File ${fileName} already exists!`);
      return;
    }

    // Choose instantiation pattern
    interface PatternQuickPickItem extends vscode.QuickPickItem {
      value: "global" | "parameter";
    }

    const instantiationPattern =
      await vscode.window.showQuickPick<PatternQuickPickItem>(
        [
          {
            label: "$(globe) Use global page from PageFactory",
            description: "Import page from PageFactory (recommended)",
            detail: "import { page } from '../PageFactory'",
            value: "global",
          },
          {
            label: "$(arrow-right) Accept page as parameter",
            description: "Inject page through constructor",
            detail: "constructor(private page: Page)",
            value: "parameter",
          },
        ],
        {
          placeHolder:
            "Choose how this Page Object will access the page instance",
          title: "Page Object Instantiation Pattern",
        }
      );

    if (!instantiationPattern) {
      return;
    }

    // Find PageFactory for dynamic import path resolution
    let pageFactoryPath: string | undefined;
    let relativeImportPath = "../PageFactory"; // Default fallback

    if (instantiationPattern.value === "global") {
      pageFactoryPath = await findPageFactory(workspaceFolders[0].uri.fsPath);
      if (pageFactoryPath) {
        relativeImportPath = getRelativePageFactoryPath(
          filePath,
          pageFactoryPath
        );
      } else {
        const createFactory = await vscode.window.showWarningMessage(
          "No PageFactory found. Would you like to create one first?",
          "Create PageFactory",
          "Continue Anyway"
        );

        if (createFactory === "Create PageFactory") {
          // Store the POM creation context to continue after PageFactory creation
          console.log("Creating PageFactory during POM creation...");
          const newPageFactoryPath = await createPageFactory(false); // Don't open PageFactory file
          console.log("PageFactory creation result:", newPageFactoryPath);
          if (newPageFactoryPath) {
            // PageFactory was successfully created, calculate the import path and continue
            pageFactoryPath = newPageFactoryPath; // Store the new PageFactory path
            relativeImportPath = getRelativePageFactoryPath(
              filePath,
              newPageFactoryPath
            );
            console.log("Calculated relative import path:", relativeImportPath);
            vscode.window.showInformationMessage(
              "PageFactory created! Continuing with POM creation..."
            );
          } else {
            // PageFactory creation failed or was cancelled
            vscode.window.showErrorMessage(
              "PageFactory creation failed. POM creation cancelled."
            );
            return;
          }
        }
      }
    }

    // Generate Page Object class content with chosen pattern
    console.log(
      "Generating POM content with pattern:",
      instantiationPattern.value,
      "and import path:",
      relativeImportPath
    );
    const pageObjectContent = generatePageObjectClassTemplate(
      className,
      instantiationPattern.value,
      relativeImportPath
    );

    // Write the file
    console.log("Writing POM file to:", filePath);
    fs.writeFileSync(filePath, pageObjectContent);

    // Open the new file
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    const patternDescription =
      instantiationPattern.value === "global"
        ? "with global page import"
        : "with page parameter";

    vscode.window.showInformationMessage(
      `Successfully created ${className}${extensionConfig.fileExtensions.pageObject} Page Object class ${patternDescription}!`
    );

    console.log("POM creation successful, offering PageFactory injection...");
    console.log("Available PageFactory path:", pageFactoryPath);

    // Immediately offer to add the newly created POM to a PageFactory
    try {
      const addToFactory = await vscode.window.showInformationMessage(
        `Would you like to add ${className} to a PageFactory?`,
        "Yes, Add to PageFactory",
        "No, Done"
      );

      console.log("User choice for PageFactory injection:", addToFactory);

      if (addToFactory === "Yes, Add to PageFactory") {
        try {
          // If we have a PageFactory path from the creation process, use it directly
          if (pageFactoryPath) {
            console.log("Using known PageFactory path:", pageFactoryPath);
            await addPageObjectToFactoryWithKnownPath(
              filePath,
              className,
              pageFactoryPath
            );
          } else {
            // Use the standard selection process
            await addPageObjectToFactoryWithPreselection(filePath, className);
          }
        } catch (error) {
          console.error("Error adding POM to PageFactory:", error);
          vscode.window.showErrorMessage(
            `Failed to add ${className} to PageFactory. You can add it manually later using the 'Add Page Objects to Page Factory' command.`
          );
        }
      }
    } catch (injectionError) {
      console.error(
        "Error during PageFactory injection prompt:",
        injectionError
      );
      // Don't show error to user since POM creation was successful
    }
  } catch (error) {
    console.error("Error creating Page Object class:", error);
    vscode.window.showErrorMessage("Failed to create Page Object class");
  }
}

// Function to generate Page Object class template
function generatePageObjectClassTemplate(
  className: string,
  pattern: "global" | "parameter" = "global",
  pageFactoryImportPath: string = "../PageFactory"
): string {
  const extensionConfig = getExtensionConfig();

  // Use custom template if provided
  if (extensionConfig.templates.pageObjectClass) {
    return extensionConfig.templates.pageObjectClass.replace(
      /\$\{className\}/g,
      className
    );
  }

  // Generate template based on chosen pattern
  if (pattern === "parameter") {
    return `import { Page } from '@playwright/test';

export class ${className} {
    // Page selectors, elements, and locators go here

    public constructor(private page: Page) {
        // Initialize page elements and setup
        // Use this.page for all page operations
    }

    // Add your page-specific methods here
    // Example:
    // async clickElement() {
    //     await this.page.click('selector');
    // }
}
`;
  }

  // Default global page pattern
  return `// Import page from PageFactory for general page operations
import { page } from '${pageFactoryImportPath}';

export class ${className} {
    // Page selectors, elements, and locators go here

    public constructor() {
        // Initialize page elements and setup
        // Use imported 'page' for all page operations
    }

    // Add your page-specific methods here
    // Example:
    // async clickElement() {
    //     await page.click('selector');
    // }
}
`;
}

// New command to use Page Object from PageFactory with interactive selection
async function usePageObjectFromFactory() {
  try {
    // Get active editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        "No active editor found. Please open a TypeScript file."
      );
      return;
    }

    // Ensure it's a TypeScript file
    if (editor.document.languageId !== "typescript") {
      vscode.window.showErrorMessage(
        "This command only works with TypeScript files."
      );
      return;
    }

    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Find PageFactory
    const pageFactoryPath = await findPageFactory(
      workspaceFolders[0].uri.fsPath
    );
    if (!pageFactoryPath) {
      vscode.window.showErrorMessage(
        "PageFactory file not found. Please create it first."
      );
      return;
    }

    // Extract Page Object getters from PageFactory
    const pageObjectGetters = await extractPageObjectGetters(pageFactoryPath);
    if (pageObjectGetters.length === 0) {
      vscode.window.showErrorMessage(
        "No Page Object getters found in PageFactory file"
      );
      return;
    }

    // Create quick pick items with available Page Objects
    const quickPickItems: vscode.QuickPickItem[] = [];

    for (const getter of pageObjectGetters) {
      const pageObjectName = getter.replace("get", ""); // Keep original case
      const camelCaseName =
        pageObjectName.charAt(0).toLowerCase() + pageObjectName.slice(1); // Convert to camelCase

      // Option without page parameter
      quickPickItems.push({
        label: `const ${camelCaseName} = ${getter}()`,
        description: "Use current/default page",
        detail: `Import ${getter} and create const without page parameter`,
      });

      // Option with page parameter
      quickPickItems.push({
        label: `const ${camelCaseName} = ${getter}(page)`,
        description: "Pass explicit page parameter",
        detail: `Import ${getter} and create const with page parameter`,
      });
    }

    // Show quick pick
    const selectedOption = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: "Select Page Object initialization pattern",
      title: "Use Page Object from PageFactory",
    });

    if (!selectedOption) {
      return;
    }

    // Parse selection
    const match = selectedOption.label.match(/const (\w+) = (\w+)\((.*?)\)/);
    if (!match) {
      vscode.window.showErrorMessage("Failed to parse selection");
      return;
    }

    const [, varName, getterName, pageParam] = match;
    const hasPageParam = pageParam.trim() === "page";

    // Check if imports already exist
    const documentText = editor.document.getText();
    const existingImports = extractExistingImportsFromDocument(documentText);

    // Step 1: Add import first (if needed)
    let needsImport = !existingImports.includes(getterName);
    if (needsImport) {
      const importLine = `import { ${getterName} } from '${getRelativePageFactoryPath(
        editor.document.uri.fsPath,
        pageFactoryPath
      )}';\n`;

      // Find the best place to insert import
      const importPosition = findImportInsertionPosition(documentText);
      await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(importPosition, 0), importLine);
      });

      vscode.window.showInformationMessage(`Import added: ${getterName}`);
    }

    // Step 2: Ask user to place cursor where they want the const assignment
    const userResponse = await vscode.window.showInformationMessage(
      `Import ${
        needsImport ? "added" : "already exists"
      }. Now place your cursor where you want the const assignment and click "Insert Here".`,
      "Insert Here",
      "Cancel"
    );

    if (userResponse !== "Insert Here") {
      return;
    }

    // Step 3: Get current cursor position and insert const assignment
    const currentPosition = editor.selection.active;
    const constAssignment = hasPageParam
      ? `const ${varName} = ${getterName}(page);`
      : `const ${varName} = ${getterName}();`;

    // Insert at current cursor position
    await editor.edit((editBuilder) => {
      editBuilder.insert(currentPosition, constAssignment);
    });

    vscode.window.showInformationMessage(`Added: ${constAssignment}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error}`);
  }
}

// Command to remove a Page Object from PageFactory
async function removePageObjectFromFactory() {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Select PageFactory using the path management system
    const pageFactoryPath = await selectPageFactoryPath();
    if (!pageFactoryPath) {
      return; // User cancelled selection
    }

    // Extract existing Page Objects from PageFactory
    const existingPageObjects = await extractPageObjectsFromPageFactory(
      pageFactoryPath
    );

    if (existingPageObjects.length === 0) {
      vscode.window.showInformationMessage(
        "No Page Objects found in this PageFactory"
      );
      return;
    }

    // Let user select which Page Objects to remove
    const selectedPageObjects = await vscode.window.showQuickPick(
      existingPageObjects.map((pageObject: PageObjectInfo) => ({
        label: pageObject.className,
        description: pageObject.getterName,
        detail: `Import: ${pageObject.importPath}`,
        picked: false,
      })),
      {
        canPickMany: true,
        placeHolder: "Select Page Objects to remove from PageFactory",
        title: "Remove Page Objects",
      }
    );

    if (!selectedPageObjects || selectedPageObjects.length === 0) {
      return;
    }

    // Confirm deletion
    const pageObjectNames = selectedPageObjects
      .map((pageObject) => pageObject.label)
      .join(", ");
    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to remove these Page Objects from PageFactory?\n\n${pageObjectNames}\n\nThis will remove imports, properties, getters, and exports.`,
      "Yes, Remove",
      "Cancel"
    );

    if (confirm !== "Yes, Remove") {
      return;
    }

    // Remove Page Objects from PageFactory
    await removePOMsFromPageFactory(
      pageFactoryPath,
      selectedPageObjects.map((pageObject) => pageObject.label)
    );

    vscode.window.showInformationMessage(
      `Successfully removed ${selectedPageObjects.length} Page Object(s) from PageFactory`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error removing Page Objects: ${error}`);
  }
}

// Command to delete an entire PageFactory
async function deletePageFactory() {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Select PageFactory using the path management system
    const pageFactoryPath = await selectPageFactoryPath();
    if (!pageFactoryPath) {
      return; // User cancelled selection
    }

    // Get PageFactory info for confirmation
    const extensionConfig = getExtensionConfig();
    const pageFactoryName = path.basename(
      pageFactoryPath,
      extensionConfig.fileExtensions.pageFactory
    );
    const existingPageObjects = await extractPageObjectsFromPageFactory(
      pageFactoryPath
    );

    // Show detailed confirmation
    let confirmMessage = `Are you sure you want to delete the PageFactory "${pageFactoryName}"?\n\n`;
    confirmMessage += `File: ${pageFactoryPath}\n\n`;

    if (existingPageObjects.length > 0) {
      confirmMessage += `This will also remove ${existingPageObjects.length} Page Object(s):\n`;
      confirmMessage += existingPageObjects
        .map((pageObject: PageObjectInfo) => `• ${pageObject.className}`)
        .join("\n");
      confirmMessage += "\n\n";
    }

    confirmMessage += "This action cannot be undone.";

    const confirm = await vscode.window.showWarningMessage(
      confirmMessage,
      "Yes, Delete",
      "Cancel"
    );

    if (confirm !== "Yes, Delete") {
      return;
    }

    // Delete the file
    if (fs.existsSync(pageFactoryPath)) {
      fs.unlinkSync(pageFactoryPath);
    }

    // Remove from saved paths
    await removePageFactoryPath(pageFactoryPath);

    // Close the file if it's open
    const openEditors = vscode.window.visibleTextEditors;
    for (const editor of openEditors) {
      if (editor.document.uri.fsPath === pageFactoryPath) {
        await vscode.commands.executeCommand(
          "workbench.action.closeActiveEditor"
        );
        break;
      }
    }

    vscode.window.showInformationMessage(
      `Successfully deleted PageFactory "${pageFactoryName}" and removed it from saved paths`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error deleting PageFactory: ${error}`);
  }
}

// Helper interface for Page Object information
interface PageObjectInfo {
  className: string;
  getterName: string;
  importPath: string;
  propertyName: string;
  exportName: string;
}

// Helper function to extract Page Objects from PageFactory
async function extractPageObjectsFromPageFactory(
  pageFactoryPath: string
): Promise<PageObjectInfo[]> {
  try {
    const content = fs.readFileSync(pageFactoryPath, "utf8");
    const pageObjects: PageObjectInfo[] = [];

    // Extract imports to get class names and paths
    const importMatches = content.match(
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/g
    );
    if (!importMatches) return [];

    const importMap = new Map<string, string>();
    importMatches.forEach((importMatch) => {
      const match = importMatch.match(
        /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/
      );
      if (match) {
        const classNames = match[1].split(",").map((name) => name.trim());
        const importPath = match[2];
        classNames.forEach((className) => {
          importMap.set(className, importPath);
        });
      }
    });

    // Extract getter methods and match with imports
    const getterMatches = content.match(
      /public\s+(get\w+)\s*\(\s*page\?\s*:\s*Page\s*\)\s*:\s*(\w+)/g
    );
    if (!getterMatches) return [];

    getterMatches.forEach((getterMatch) => {
      const match = getterMatch.match(
        /public\s+(get\w+)\s*\(\s*page\?\s*:\s*Page\s*\)\s*:\s*(\w+)/
      );
      if (match) {
        const getterName = match[1];
        const className = match[2];
        const importPath = importMap.get(className);

        if (importPath && getterName !== "getPage") {
          const extensionConfig = getExtensionConfig();
          const propertyName = `${
            extensionConfig.namingConventions.propertyPrefix
          }${classNameToPropertyCase(className)}`;
          const exportName = `get${className}`;

          pageObjects.push({
            className,
            getterName,
            importPath,
            propertyName,
            exportName,
          });
        }
      }
    });

    return pageObjects;
  } catch (error) {
    return [];
  }
}

// Helper function to remove Page Objects from PageFactory
async function removePOMsFromPageFactory(
  pageFactoryPath: string,
  classNamesToRemove: string[]
): Promise<void> {
  try {
    let content = fs.readFileSync(pageFactoryPath, "utf8");
    const lines = content.split("\n");

    // Remove imports
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("import")) {
        // Check if this import contains any of the classes to remove
        const hasClassToRemove = classNamesToRemove.some(
          (className) =>
            trimmedLine.includes(`{ ${className} }`) ||
            trimmedLine.includes(`{${className}}`) ||
            (trimmedLine.includes(`{ `) &&
              trimmedLine.includes(` ${className} `)) ||
            (trimmedLine.includes(`{ `) &&
              trimmedLine.includes(` ${className},`)) ||
            trimmedLine.includes(`, ${className} `) ||
            trimmedLine.includes(`,${className}}`)
        );
        return !hasClassToRemove;
      }
      return true;
    });

    content = filteredLines.join("\n");

    // Remove properties
    classNamesToRemove.forEach((className) => {
      const extensionConfig = getExtensionConfig();
      const propertyName = `${
        extensionConfig.namingConventions.propertyPrefix
      }${classNameToPropertyCase(className)}`;
      const propertyRegex = new RegExp(
        `\\s*private\\s+${propertyName}:\\s*${className};?\\s*\\n?`,
        "g"
      );
      content = content.replace(propertyRegex, "");
    });

    // Remove getter methods
    classNamesToRemove.forEach((className) => {
      const getterRegex = new RegExp(
        `\\s*public\\s+get${className}\\s*\\([^)]*\\)\\s*:\\s*${className}\\s*\\{[^}]*\\}\\s*\\n?`,
        "gs"
      );
      content = content.replace(getterRegex, "");
    });

    // Remove exports
    classNamesToRemove.forEach((className) => {
      const exportRegex = new RegExp(
        `\\s*export\\s+const\\s+get${className}\\s*=.*?;\\s*\\n?`,
        "g"
      );
      content = content.replace(exportRegex, "");
    });

    // Clean up extra blank lines
    content = content.replace(/\n\s*\n\s*\n/g, "\n\n");

    // Write the updated content
    fs.writeFileSync(pageFactoryPath, content);

    // Open the updated file
    const document = await vscode.workspace.openTextDocument(pageFactoryPath);
    await vscode.window.showTextDocument(document);
  } catch (error) {
    throw new Error(`Failed to remove Page Objects from PageFactory: ${error}`);
  }
}

// Helper function to extract existing imports from document
function extractExistingImportsFromDocument(content: string): string[] {
  const importMatches = content.match(
    /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*PageFactory['"];?/g
  );
  if (!importMatches) return [];

  const imports: string[] = [];
  importMatches.forEach((match) => {
    const importsMatch = match.match(/\{\s*([^}]+)\s*\}/);
    if (importsMatch) {
      const importList = importsMatch[1].split(",").map((i) => i.trim());
      imports.push(...importList);
    }
  });
  return imports;
}

// Helper function to get relative path to PageFactory
function getRelativePageFactoryPath(
  currentFilePath: string,
  pageFactoryPath: string
): string {
  const extensionConfig = getExtensionConfig();
  const relativePath = path.relative(
    path.dirname(currentFilePath),
    pageFactoryPath
  );

  let processedPath = relativePath
    .replace(/\\/g, "/")
    .replace(extensionConfig.fileExtensions.pageFactory, "");

  if (extensionConfig.importPaths.useRelativePaths) {
    return processedPath.startsWith(".")
      ? processedPath
      : extensionConfig.importPaths.defaultPrefix + processedPath;
  }

  return processedPath;
}

// Helper function to find best position for import insertion
function findImportInsertionPosition(content: string): number {
  const lines = content.split("\n");

  let importInsertLine = 0;
  let lastImportLine = -1;
  let foundFirstNonCommentLine = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line === "") {
      continue;
    }

    // Skip comments and eslint config
    if (
      line.startsWith("//") ||
      line.startsWith("/*") ||
      line.startsWith("*") ||
      line.startsWith("*/")
    ) {
      continue;
    }

    // Skip eslint directives
    if (
      line.startsWith("/* eslint") ||
      line.includes("eslint-disable") ||
      line.includes("eslint-enable")
    ) {
      continue;
    }

    // If it's an import statement
    if (line.startsWith("import ")) {
      lastImportLine = i;
      foundFirstNonCommentLine = true;
    } else if (!foundFirstNonCommentLine) {
      // This is the first non-comment, non-import line
      importInsertLine = i;
      foundFirstNonCommentLine = true;
      break;
    } else if (lastImportLine !== -1) {
      // We've found imports, and this is the first non-import line after them
      break;
    } else {
      // No imports found, this is where we should place it
      importInsertLine = i;
      break;
    }
  }

  // If we found imports, insert after the last import
  if (lastImportLine !== -1) {
    return lastImportLine + 1;
  }

  // Otherwise, insert at the position we determined
  return importInsertLine;
}

// Extract Page Object getter methods from PageFactory
async function extractPageObjectGetters(
  pageFactoryPath: string
): Promise<string[]> {
  try {
    const content = fs.readFileSync(pageFactoryPath, "utf8");
    const getterMatches = content.match(
      /public\s+(get\w+)\s*\(\s*page\?\s*:\s*Page\s*\)/g
    );

    if (!getterMatches) return [];

    return getterMatches
      .map((match) => {
        const methodMatch = match.match(/get\w+/);
        return methodMatch ? methodMatch[0] : "";
      })
      .filter((name) => name && name !== "getPage");
  } catch {
    return [];
  }
}

// Delete Page Object with smart reference checking
async function deletePageObject() {
  try {
    const extensionConfig = getExtensionConfig();

    // Get current workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Find all Page Object files
    const pageObjectFiles = await findAllPageObjectFiles(
      workspaceFolders[0].uri.fsPath
    );

    if (pageObjectFiles.length === 0) {
      vscode.window.showInformationMessage(
        "No Page Object files found in workspace"
      );
      return;
    }

    // Let user select which POM to delete
    const pomOptions = pageObjectFiles.map((filePath) => {
      const className = extractClassNameFromFile(filePath);
      const relativePath = path.relative(
        workspaceFolders[0].uri.fsPath,
        filePath
      );
      return {
        label: `$(file) ${className}`,
        description: relativePath,
        detail: filePath,
        filePath: filePath,
        className: className,
      };
    });

    const selectedPom = await vscode.window.showQuickPick(pomOptions, {
      placeHolder: "Select Page Object to delete",
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selectedPom) {
      return;
    }

    // Check for references across the workspace
    const referenceCheck = await checkPageObjectReferences(
      selectedPom.filePath,
      selectedPom.className
    );

    // If POM is referenced elsewhere, prevent deletion
    if (referenceCheck.hasExternalReferences) {
      const referencesText = referenceCheck.externalReferences
        .map(
          (ref) =>
            `• ${path.relative(
              workspaceFolders[0].uri.fsPath,
              ref.filePath
            )} (line ${ref.lineNumber})`
        )
        .join("\n");

      vscode.window.showWarningMessage(
        `Cannot delete ${selectedPom.className}. It's referenced in other files:\n\n${referencesText}`,
        { modal: true }
      );
      return;
    }

    // If POM is used in PageFactory, ask about removal
    let removeFromPageFactory = false;
    if (referenceCheck.pageFactoryUsage.length > 0) {
      const pfUsageText = referenceCheck.pageFactoryUsage
        .map((pf) => path.relative(workspaceFolders[0].uri.fsPath, pf.filePath))
        .join(", ");

      const choice = await vscode.window.showWarningMessage(
        `${selectedPom.className} is used in PageFactory: ${pfUsageText}\n\nWould you like to remove it from PageFactory as well?`,
        { modal: true },
        "Remove from PageFactory",
        "Keep in PageFactory",
        "Cancel"
      );

      if (choice === "Cancel") {
        return;
      }

      removeFromPageFactory = choice === "Remove from PageFactory";
    }

    // Final confirmation
    const confirmMessage = removeFromPageFactory
      ? `Delete ${selectedPom.className} and remove from PageFactory?`
      : `Delete ${selectedPom.className}?`;

    const finalConfirm = await vscode.window.showWarningMessage(
      confirmMessage,
      { modal: true },
      "Delete",
      "Cancel"
    );

    if (finalConfirm !== "Delete") {
      return;
    }

    // Remove from PageFactory if requested
    if (removeFromPageFactory) {
      for (const pfUsage of referenceCheck.pageFactoryUsage) {
        await removePageObjectFromPageFactory(
          pfUsage.filePath,
          selectedPom.className
        );
      }
    }

    // Delete the POM file
    fs.unlinkSync(selectedPom.filePath);

    vscode.window.showInformationMessage(
      `${selectedPom.className} deleted successfully${
        removeFromPageFactory ? " and removed from PageFactory" : ""
      }`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete Page Object: ${error}`);
  }
}

// Find all Page Object files in workspace
async function findAllPageObjectFiles(
  workspacePath: string
): Promise<string[]> {
  const files: string[] = [];
  const extensionConfig = getExtensionConfig();

  function walkDir(currentPath: string) {
    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (
          stat.isDirectory() &&
          !item.startsWith(".") &&
          item !== "node_modules"
        ) {
          walkDir(fullPath);
        } else if (
          item.endsWith(extensionConfig.fileExtensions.typescript) &&
          !isPageFactoryFile(fullPath) &&
          isPageObjectFile(fullPath)
        ) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  walkDir(workspacePath);
  return files;
}

// Check if file is a Page Object
function isPageObjectFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf8");

    // Look for export class patterns that are not PageFactory
    const classPatterns = [
      /export\s+class\s+\w+/,
      /class\s+\w+/,
      /export\s+default\s+class\s+\w+/,
    ];

    const hasClass = classPatterns.some((pattern) => pattern.test(content));

    // Should have class but not be PageFactory
    return hasClass && !isPageFactoryFile(filePath);
  } catch (error) {
    return false;
  }
}

// Extract class name from file
function extractClassNameFromFile(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const classMatch = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
    return classMatch ? classMatch[1] : path.basename(filePath, ".ts");
  } catch (error) {
    return path.basename(filePath, ".ts");
  }
}

// Check Page Object references across workspace
async function checkPageObjectReferences(
  pomFilePath: string,
  className: string
): Promise<{
  hasExternalReferences: boolean;
  externalReferences: Array<{
    filePath: string;
    lineNumber: number;
    content: string;
  }>;
  pageFactoryUsage: Array<{ filePath: string; type: "instance" | "import" }>;
}> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return {
      hasExternalReferences: false,
      externalReferences: [],
      pageFactoryUsage: [],
    };
  }

  const externalReferences: Array<{
    filePath: string;
    lineNumber: number;
    content: string;
  }> = [];
  const pageFactoryUsage: Array<{
    filePath: string;
    type: "instance" | "import";
  }> = [];

  // Find all TypeScript files in workspace
  const allTsFiles = findTSFiles(workspaceFolders[0].uri.fsPath);

  for (const filePath of allTsFiles) {
    if (filePath === pomFilePath) continue; // Skip the POM file itself

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      const isPageFactoryFileCheck = isPageFactoryFile(filePath);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check for class name references
        if (line.includes(className)) {
          if (isPageFactoryFileCheck) {
            // Check if it's an instance usage in PageFactory
            if (
              line.includes(`private _${className.toLowerCase()}`) ||
              line.includes(`get${className}`) ||
              line.includes(`return this._${className.toLowerCase()}`)
            ) {
              pageFactoryUsage.push({ filePath, type: "instance" });
            } else if (line.includes(`import`) && line.includes(className)) {
              pageFactoryUsage.push({ filePath, type: "import" });
            }
          } else {
            // External reference in other files
            if (
              (line.includes(`import`) && line.includes(className)) ||
              line.includes(`new ${className}`) ||
              line.includes(`${className}.`) ||
              line.includes(`: ${className}`) ||
              line.includes(`<${className}>`)
            ) {
              externalReferences.push({
                filePath,
                lineNumber,
                content: line.trim(),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
    }
  }

  return {
    hasExternalReferences: externalReferences.length > 0,
    externalReferences,
    pageFactoryUsage,
  };
}

// Find all TypeScript files in workspace - use existing findTSFiles function

// Remove Page Object from PageFactory file
async function removePageObjectFromPageFactory(
  pageFactoryPath: string,
  className: string
): Promise<void> {
  try {
    const content = fs.readFileSync(pageFactoryPath, "utf8");
    let updatedContent = content;

    const propertyName = `_${className.toLowerCase()}`;
    const getterName = `get${className}`;

    // Remove import line
    const importRegex = new RegExp(
      `import\\s*{[^}]*\\b${className}\\b[^}]*}\\s*from[^;]+;\\s*\n?`,
      "gm"
    );
    updatedContent = updatedContent.replace(importRegex, "");

    // Remove property declaration
    const propertyRegex = new RegExp(
      `\\s*private\\s+${propertyName}[^;]*;\\s*\n?`,
      "gm"
    );
    updatedContent = updatedContent.replace(propertyRegex, "");

    // Remove getter method
    const getterRegex = new RegExp(
      `\\s*${getterName}\\([^)]*\\)[^}]*{[^}]*}\\s*\n?`,
      "gms"
    );
    updatedContent = updatedContent.replace(getterRegex, "");

    // Clean up any extra commas or whitespace
    updatedContent = updatedContent.replace(/,\s*,/g, ",");
    updatedContent = updatedContent.replace(/{\s*,/g, "{");
    updatedContent = updatedContent.replace(/,\s*}/g, "}");

    fs.writeFileSync(pageFactoryPath, updatedContent, "utf8");
  } catch (error) {
    throw new Error(`Failed to remove ${className} from PageFactory: ${error}`);
  }
}

export function deactivate() {}

// Command to clean up orphaned Page Objects from PageFactory
async function cleanupOrphanedPageObjects() {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Select PageFactory using the path management system
    const pageFactoryPath = await selectPageFactoryPath();
    if (!pageFactoryPath) {
      return; // User cancelled selection
    }

    // Extract existing Page Objects from PageFactory
    const existingPageObjects = await extractPageObjectsFromPageFactory(
      pageFactoryPath
    );

    if (existingPageObjects.length === 0) {
      vscode.window.showInformationMessage(
        "No Page Objects found in this PageFactory"
      );
      return;
    }

    // Check which Page Object files still exist
    const orphanedPageObjects: PageObjectInfo[] = [];
    const workspacePath = path.dirname(pageFactoryPath);

    for (const pageObject of existingPageObjects) {
      // Construct the full path to the Page Object file
      const extensionConfig = getExtensionConfig();
      const pageObjectFilePath = path.resolve(
        workspacePath,
        pageObject.importPath + extensionConfig.fileExtensions.typescript
      );

      if (!fs.existsSync(pageObjectFilePath)) {
        orphanedPageObjects.push(pageObject);
      }
    }

    if (orphanedPageObjects.length === 0) {
      vscode.window.showInformationMessage(
        "No orphaned Page Objects found. All referenced files exist."
      );
      return;
    }

    // Show orphaned Page Objects to user
    const confirm = await vscode.window.showWarningMessage(
      `Found ${
        orphanedPageObjects.length
      } orphaned Page Object(s) in PageFactory:\n\n${orphanedPageObjects
        .map(
          (pageObject) => `• ${pageObject.className} (${pageObject.importPath})`
        )
        .join(
          "\n"
        )}\n\nThese files no longer exist. Remove them from PageFactory?`,
      "Yes, Clean Up",
      "Cancel"
    );

    if (confirm !== "Yes, Clean Up") {
      return;
    }

    // Remove orphaned Page Objects
    await removePOMsFromPageFactory(
      pageFactoryPath,
      orphanedPageObjects.map((pageObject) => pageObject.className)
    );

    vscode.window.showInformationMessage(
      `Successfully cleaned up ${orphanedPageObjects.length} orphaned Page Object(s) from PageFactory`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error cleaning up orphaned Page Objects: ${error}`
    );
  }
}

// ==================== PageFactory Path Management ====================

interface SavedPageFactoryPath {
  path: string;
  label: string;
  lastUsed: number;
}

// Get saved PageFactory paths from global state
function getSavedPageFactoryPaths(): SavedPageFactoryPath[] {
  const saved = extensionContext.globalState.get<SavedPageFactoryPath[]>(
    "snapwright.pageFactoryPaths",
    []
  );
  return saved.sort((a, b) => b.lastUsed - a.lastUsed); // Sort by most recently used
}

// Save PageFactory paths to global state
async function savePageFactoryPaths(
  paths: SavedPageFactoryPath[]
): Promise<void> {
  await extensionContext.globalState.update(
    "snapwright.pageFactoryPaths",
    paths
  );
}

// Add or update a PageFactory path
async function addPageFactoryPath(
  filePath: string,
  label?: string
): Promise<void> {
  const paths = getSavedPageFactoryPaths();
  const existingIndex = paths.findIndex((p) => p.path === filePath);

  if (existingIndex >= 0) {
    // Update existing entry - preserve existing label if no new label provided
    const existingEntry = paths[existingIndex];
    paths[existingIndex] = {
      path: filePath,
      label: label !== undefined ? label : existingEntry.label,
      lastUsed: Date.now(),
    };
  } else {
    // Add new entry - use provided label or default to directory name
    const pathEntry: SavedPageFactoryPath = {
      path: filePath,
      label: label || path.basename(path.dirname(filePath)),
      lastUsed: Date.now(),
    };
    paths.push(pathEntry);
  }

  await savePageFactoryPaths(paths);
}

// Remove a PageFactory path
async function removePageFactoryPath(filePath: string): Promise<void> {
  const paths = getSavedPageFactoryPaths();
  const filteredPaths = paths.filter((p) => p.path !== filePath);
  await savePageFactoryPaths(filteredPaths);
}

// Show PageFactory path management UI
async function selectPageFactoryPath(): Promise<string | null> {
  const savedPaths = getSavedPageFactoryPaths();

  // Create quick pick items
  const quickPickItems: vscode.QuickPickItem[] = [];

  // Add saved paths
  if (savedPaths.length > 0) {
    quickPickItems.push({
      label: "📁 Recently Used PageFactory Files",
      kind: vscode.QuickPickItemKind.Separator,
    });

    savedPaths.forEach((savedPath, index) => {
      quickPickItems.push({
        label: `$(file) ${savedPath.label}`,
        description: savedPath.path,
        detail: `Last used: ${new Date(savedPath.lastUsed).toLocaleString()}`,
        alwaysShow: true,
      });
    });

    quickPickItems.push({
      label: "⚙️ Management Options",
      kind: vscode.QuickPickItemKind.Separator,
    });
  }

  // Add management options
  quickPickItems.push(
    {
      label: "$(add) Browse for new PageFactory file",
      description: "Select a new PageFactory file",
      alwaysShow: true,
    },
    {
      label: "$(edit) Edit saved paths",
      description: "Modify labels or remove saved paths",
      alwaysShow: true,
    }
  );

  const selection = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "Select PageFactory file or manage saved paths",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!selection) {
    return null; // User cancelled
  }

  // Handle different selections
  if (selection.label === "$(add) Browse for new PageFactory file") {
    return await browseForPageFactory();
  } else if (selection.label === "$(edit) Edit saved paths") {
    return await editSavedPaths();
  } else {
    // User selected a saved path
    const selectedPath = selection.description!;

    // Verify the file still exists
    if (!fs.existsSync(selectedPath)) {
      const choice = await vscode.window.showWarningMessage(
        `PageFactory file not found: ${selectedPath}`,
        "Remove from list",
        "Browse for new location",
        "Cancel"
      );

      if (choice === "Remove from list") {
        await removePageFactoryPath(selectedPath);
        return await selectPageFactoryPath(); // Show the menu again
      } else if (choice === "Browse for new location") {
        return await browseForPageFactory();
      } else {
        return null;
      }
    }

    // Update last used time
    await addPageFactoryPath(selectedPath);
    return selectedPath;
  }
}

// Browse for PageFactory file
async function browseForPageFactory(): Promise<string | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder found");
    return null;
  }

  const extensionConfig = getExtensionConfig();
  const fileUri = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    defaultUri: workspaceFolders[0].uri,
    filters: {
      "TypeScript Files": [
        extensionConfig.fileExtensions.typescript.replace(".", ""),
      ],
    },
    title: "Select PageFactory file",
  });

  if (!fileUri || fileUri.length === 0) {
    return null;
  }

  const selectedPath = fileUri[0].fsPath;

  // Verify it's a valid PageFactory file
  try {
    const isValidPageFactory = isPageFactoryFile(selectedPath);

    if (!isValidPageFactory) {
      const proceed = await vscode.window.showWarningMessage(
        "The selected file doesn't appear to contain a PageFactory class. Continue anyway?",
        "Yes",
        "No"
      );
      if (proceed !== "Yes") {
        return null;
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error reading file: ${error}`);
    return null;
  }

  // Ask for a label
  const label = await vscode.window.showInputBox({
    prompt: "Enter a label for this PageFactory (optional)",
    value: path.basename(path.dirname(selectedPath)),
    validateInput: (value) => {
      if (value && value.trim().length === 0) {
        return "Label cannot be empty if provided";
      }
      return null;
    },
  });

  // Save the path
  await addPageFactoryPath(selectedPath, label || undefined);

  return selectedPath;
}

// Edit saved paths
async function editSavedPaths(): Promise<string | null> {
  const savedPaths = getSavedPageFactoryPaths();

  if (savedPaths.length === 0) {
    vscode.window.showInformationMessage("No saved paths to edit");
    return await browseForPageFactory();
  }

  const quickPickItems: vscode.QuickPickItem[] = savedPaths.map(
    (savedPath) => ({
      label: `$(file) ${savedPath.label}`,
      description: savedPath.path,
      detail: "Click to edit or use, right-click for more options",
    })
  );

  quickPickItems.push({
    label: "$(trash) Clear all saved paths",
    description: "Remove all saved PageFactory paths",
    detail: "This action cannot be undone",
  });

  const selection = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "Select path to edit or manage",
  });

  if (!selection) {
    return null;
  }

  if (selection.label === "$(trash) Clear all saved paths") {
    const confirm = await vscode.window.showWarningMessage(
      "Are you sure you want to clear all saved PageFactory paths?",
      "Yes",
      "No"
    );
    if (confirm === "Yes") {
      await savePageFactoryPaths([]);
      vscode.window.showInformationMessage("All saved paths cleared");
    }
    return await selectPageFactoryPath();
  }

  const selectedPath = selection.description!;

  // Show edit options
  const action = await vscode.window.showQuickPick(
    [
      {
        label: "$(edit) Edit label",
        description: "Change the display label for this path",
      },
      {
        label: "$(file) Use this path",
        description: "Select this PageFactory for current operation",
      },
      {
        label: "$(trash) Remove from list",
        description: "Delete this saved path",
      },
    ],
    {
      placeHolder: `Manage: ${selection.label}`,
    }
  );

  if (!action) {
    return await editSavedPaths(); // Go back to edit menu
  }

  if (action.label === "$(edit) Edit label") {
    const currentPath = savedPaths.find((p) => p.path === selectedPath);
    const newLabel = await vscode.window.showInputBox({
      prompt: "Enter new label",
      value: currentPath?.label,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Label cannot be empty";
        }
        return null;
      },
    });

    if (newLabel) {
      await addPageFactoryPath(selectedPath, newLabel);
      vscode.window.showInformationMessage("Label updated successfully");
    }
    return await editSavedPaths();
  } else if (action.label === "$(file) Use this path") {
    await addPageFactoryPath(selectedPath); // Update last used time
    return selectedPath;
  } else if (action.label === "$(trash) Remove from list") {
    await removePageFactoryPath(selectedPath);
    vscode.window.showInformationMessage("Path removed from list");
    return await editSavedPaths();
  }

  return null;
}
