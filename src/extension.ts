import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Global variable to store extension context for state management
let extensionContext: vscode.ExtensionContext;

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

  // Register command to validate architectural integrity
  let validateArchitecturalIntegrityCommand = vscode.commands.registerCommand(
    "snapwright.validateArchitecturalIntegrity",
    async () => {
      await validateArchitecturalIntegrity();
    }
  );

  context.subscriptions.push(createPageFactoryCommand);
  context.subscriptions.push(addPageObjectToFactoryCommand);
  context.subscriptions.push(createPageObjectClassCommand);
  context.subscriptions.push(usePageObjectFromFactoryCommand);
  context.subscriptions.push(removePageObjectFromFactoryCommand);
  context.subscriptions.push(deletePageFactoryCommand);
  context.subscriptions.push(cleanupOrphanedPageObjectsCommand);
  context.subscriptions.push(validateArchitecturalIntegrityCommand);
}

// Helper function to check for PageFactory nesting
function checkForPageFactoryNesting(selectedPath: string): {
  hasParentPageFactory: boolean;
  hasChildPageFactory: boolean;
  parentPath?: string;
  childPath?: string;
} {
  const extensionConfig = getExtensionConfig();

  // Check for parent PageFactory by walking up the directory tree
  let currentPath = path.dirname(selectedPath);
  let hasParentPageFactory = false;
  let parentPath: string | undefined;

  while (currentPath !== path.dirname(currentPath)) {
    // Stop at root
    const items = fs.readdirSync(currentPath);
    const pageFactoryFile = items.find(
      (item) =>
        item.includes("PageFactory") &&
        item.endsWith(extensionConfig.fileExtensions.pageFactory)
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
              subItem.includes("PageFactory") &&
              subItem.endsWith(extensionConfig.fileExtensions.pageFactory)
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

// Enhanced circular reference detection for architectural integrity
function checkForCircularPageObjectUsage(
  currentFilePath: string,
  pageFactoryPath: string
): {
  isCircular: boolean;
  currentClassName?: string;
  getterMethodName?: string;
  message?: string;
} {
  try {
    // Check if current file is a Page Object class
    const currentFileContent = fs.readFileSync(currentFilePath, "utf8");
    const currentClassMatch = currentFileContent.match(
      /export\s+class\s+(\w+)/
    );

    if (!currentClassMatch) {
      return { isCircular: false }; // Not a class file
    }

    const currentClassName = currentClassMatch[1];

    // Check if PageFactory exists and imports this class
    if (!fs.existsSync(pageFactoryPath)) {
      return { isCircular: false }; // No PageFactory to check
    }

    const pageFactoryContent = fs.readFileSync(pageFactoryPath, "utf8");

    // Check if this class is imported in PageFactory
    const importPattern = new RegExp(
      `import\\s+\\{[^}]*\\b${currentClassName}\\b[^}]*\\}\\s+from\\s+['"][^'"]*`,
      "g"
    );
    const hasImport = importPattern.test(pageFactoryContent);

    if (!hasImport) {
      return { isCircular: false }; // Not managed by PageFactory
    }

    // Check if there's a getter method for this class
    const getterPattern = new RegExp(
      `(get\\w+)\\s*\\([^)]*\\)\\s*:\\s*${currentClassName}`,
      "g"
    );
    const getterMatch = pageFactoryContent.match(getterPattern);

    if (getterMatch && getterMatch.length > 0) {
      const fullGetterMatch = getterMatch[0];
      const getterNameMatch = fullGetterMatch.match(/(get\w+)/);
      const getterMethodName = getterNameMatch ? getterNameMatch[1] : null;

      if (getterMethodName) {
        return {
          isCircular: true,
          currentClassName,
          getterMethodName,
          message: `Cannot use "${getterMethodName}()" within the ${currentClassName} class itself. This would create a circular dependency.`,
        };
      }
    }

    // Also check for convention-based getters (e.g., getLoginPage for LoginPage class)
    const conventionGetterPattern = new RegExp(
      `(get${currentClassName})\\s*\\(`,
      "i"
    );
    if (conventionGetterPattern.test(pageFactoryContent)) {
      const getterNameMatch = pageFactoryContent.match(
        new RegExp(`(get${currentClassName})\\s*\\(`, "i")
      );
      const getterMethodName = getterNameMatch ? getterNameMatch[1] : null;

      if (getterMethodName) {
        return {
          isCircular: true,
          currentClassName,
          getterMethodName,
          message: `Cannot use "${getterMethodName}()" within the ${currentClassName} class itself. This would create a circular dependency.`,
        };
      }
    }

    return { isCircular: false };
  } catch (error) {
    return { isCircular: false }; // Error reading files, assume no circular reference
  }
}

async function createPageFactory() {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Step 1: Show directory picker for PageFactory location
    const selectedFolder = await selectDirectory(workspaceFolders[0].uri);
    if (!selectedFolder) {
      return;
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
          `A PageFactory already exists in a parent directory at "${relativePath}". Creating nested PageFactories is not recommended as it violates architectural boundaries.\n\nDo you want to continue anyway?`,
          "Continue Anyway",
          "Choose Different Location",
          "Cancel"
        );

        if (action === "Cancel") {
          return;
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
          `A PageFactory already exists in a subdirectory at "${relativePath}". Creating a parent PageFactory over existing ones is not recommended as it violates architectural boundaries.\n\nDo you want to continue anyway?`,
          "Continue Anyway",
          "Choose Different Location",
          "Cancel"
        );

        if (action === "Cancel") {
          return;
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
        return; // User cancelled
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
          return;
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

    // Open the created file
    const document = await vscode.workspace.openTextDocument(pageFactoryPath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(
      `PageFactory "${pageFactoryName}${extensionConfig.fileExtensions.pageFactory}" created successfully and saved to your PageFactory list!`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error creating PageFactory: ${error}`);
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

  function isPageFactoryFile(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      // Check if file contains PageFactory class definition
      return (
        content.includes("class PageFactory") ||
        content.includes("PageFactory.instance") ||
        content.includes("export const pageFactory")
      );
    } catch (error) {
      // If we can't read the file, check by filename
      return path.basename(filePath).includes("PageFactory");
    }
  }

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
          item.includes("PageFactory") &&
          item.endsWith(extensionConfig.fileExtensions.pageFactory)
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

    // Generate Page Object class content
    const pageObjectContent = generatePageObjectClassTemplate(className);

    // Write the file
    fs.writeFileSync(filePath, pageObjectContent);

    // Open the new file
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(
      `Successfully created ${className}${extensionConfig.fileExtensions.pageObject} Page Object class!`
    );
  } catch (error) {
    console.error("Error creating Page Object class:", error);
    vscode.window.showErrorMessage("Failed to create Page Object class");
  }
}

// Function to generate Page Object class template
function generatePageObjectClassTemplate(className: string): string {
  const extensionConfig = getExtensionConfig();

  // Use custom template if provided
  if (extensionConfig.templates.pageObjectClass) {
    return extensionConfig.templates.pageObjectClass.replace(
      /\$\{className\}/g,
      className
    );
  }

  // Default template with architectural guidance
  return `// Import page from PageFactory for general page operations
import { page } from '../PageFactory';

/**
 * ⚠️  ARCHITECTURAL NOTE: 
 * Do NOT import get${className}() from PageFactory in this file.
 * This would create a circular dependency. Use the SnapWright 
 * command "Use Page Object from PageFactory" in test files instead.
 */

export class ${className} {
    // Page selectors, elements, and locators go here

    public constructor() {
        // Initialize page elements and setup
    }

    // Add your page-specific methods here
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

    // Check for circular reference using enhanced validation
    const circularCheck = checkForCircularPageObjectUsage(
      editor.document.uri.fsPath,
      pageFactoryPath
    );

    // If circular reference detected, show detailed warning and stop
    if (circularCheck.isCircular) {
      const currentFileName = path.basename(editor.document.uri.fsPath, ".ts");
      vscode.window
        .showWarningMessage(
          `🚫 Circular Reference Prevented!\n\n${circularCheck.message}\n\nArchitectural Rule: Page Object classes should not import their own PageFactory getters. This maintains clean separation of concerns.\n\nSuggestion: Use this command from test files, spec files, or other Page Objects instead.`,
          {
            title: "Learn More",
            action: "learnMore",
          },
          {
            title: "Understood",
            action: "dismiss",
          }
        )
        .then((selection) => {
          if (selection?.action === "learnMore") {
            vscode.env.openExternal(
              vscode.Uri.parse(
                "https://github.com/your-repo/snapwright#architectural-guidelines"
              )
            );
          }
        });
      return;
    }

    // All getters are available - no circular reference issues
    const availableGetters = pageObjectGetters;

    // Create quick pick items with available Page Objects
    const quickPickItems: vscode.QuickPickItem[] = [];

    for (const getter of availableGetters) {
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

// Helper function to detect circular reference
async function detectCircularReference(
  currentFilePath: string,
  pageFactoryPath: string
): Promise<string | null> {
  try {
    // Read PageFactory content
    const pageFactoryContent = fs.readFileSync(pageFactoryPath, "utf8");

    // Get the current file's class name
    const currentFileContent = fs.readFileSync(currentFilePath, "utf8");
    const currentClassMatch = currentFileContent.match(
      /export\s+class\s+(\w+)/
    );

    if (!currentClassMatch) {
      return null; // Not a class file
    }

    const currentClassName = currentClassMatch[1];

    // Check if this class is imported in PageFactory
    const importPattern = new RegExp(
      `import\\s+\\{[^}]*\\b${currentClassName}\\b[^}]*\\}\\s+from\\s+['"][^'"]*`,
      "g"
    );
    const hasImport = importPattern.test(pageFactoryContent);

    if (!hasImport) {
      return null; // Not imported in PageFactory, so no circular reference possible
    }

    // Check if there's a getter method that returns this class
    const getterPattern = new RegExp(
      `(get\\w+)\\s*\\([^)]*\\)\\s*:\\s*${currentClassName}`,
      "g"
    );
    const getterMatch = pageFactoryContent.match(getterPattern);

    if (getterMatch && getterMatch.length > 0) {
      // Extract the getter method name
      const fullGetterMatch = getterMatch[0];
      const getterNameMatch = fullGetterMatch.match(/(get\w+)/);
      return getterNameMatch ? getterNameMatch[1] : null;
    }

    // Also check for cases where the class might be used in getter methods without explicit type annotation
    // Look for patterns like "get<ClassName>" or similar
    const classBasedGetterPattern = new RegExp(
      `get${currentClassName}\\s*\\(`,
      "i"
    );
    if (classBasedGetterPattern.test(pageFactoryContent)) {
      const getterNameMatch = pageFactoryContent.match(
        new RegExp(`(get${currentClassName})\\s*\\(`, "i")
      );
      return getterNameMatch ? getterNameMatch[1] : null;
    }

    return null;
  } catch (error) {
    return null; // Error reading files, assume no circular reference
  }
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

  const pathEntry: SavedPageFactoryPath = {
    path: filePath,
    label: label || path.basename(path.dirname(filePath)),
    lastUsed: Date.now(),
  };

  if (existingIndex >= 0) {
    // Update existing entry
    paths[existingIndex] = pathEntry;
  } else {
    // Add new entry
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
    const content = fs.readFileSync(selectedPath, "utf8");
    if (
      !content.includes("class PageFactory") &&
      !content.includes("PageFactory")
    ) {
      const proceed = await vscode.window.showWarningMessage(
        "The selected file doesn't appear to be a PageFactory. Continue anyway?",
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

// Validate architectural integrity across the workspace
async function validateArchitecturalIntegrity() {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    vscode.window.showInformationMessage(
      "🔍 Scanning workspace for architectural violations..."
    );

    const issues: string[] = [];
    const workspacePath = workspaceFolders[0].uri.fsPath;

    // Find all PageFactory files
    const pageFactoryFiles = await findAllPageFactoryFiles(workspacePath);

    if (pageFactoryFiles.length === 0) {
      vscode.window.showInformationMessage(
        "✅ No PageFactory files found in workspace."
      );
      return;
    }

    // Check each PageFactory for issues
    for (const pageFactoryPath of pageFactoryFiles) {
      const pageFactoryIssues = await validatePageFactoryIntegrity(
        pageFactoryPath
      );
      issues.push(...pageFactoryIssues);
    }

    // Find all TypeScript files that might be Page Objects
    const pageObjectFiles = await findAllPageObjectFiles(workspacePath);

    // Check each potential Page Object for circular references
    for (const pageObjectFile of pageObjectFiles) {
      for (const pageFactoryPath of pageFactoryFiles) {
        const circularCheck = checkForCircularPageObjectUsage(
          pageObjectFile,
          pageFactoryPath
        );
        if (circularCheck.isCircular) {
          // Check if the file actually contains the problematic import
          const fileContent = fs.readFileSync(pageObjectFile, "utf8");
          const importPattern = new RegExp(
            `import\\s+\\{[^}]*\\b${circularCheck.getterMethodName}\\b[^}]*\\}`,
            "g"
          );

          if (importPattern.test(fileContent)) {
            const fileName = path.relative(workspacePath, pageObjectFile);
            issues.push(
              `🚫 ${fileName}: Contains circular import "${circularCheck.getterMethodName}" - ${circularCheck.message}`
            );
          }
        }
      }
    }

    // Show results
    if (issues.length === 0) {
      vscode.window.showInformationMessage(
        "✅ Architectural Integrity Check Complete: No violations found!"
      );
    } else {
      const issueReport = issues.join("\n\n");
      const action = await vscode.window.showWarningMessage(
        `⚠️ Found ${issues.length} architectural violation(s):\n\n${issueReport}\n\nWould you like to see detailed guidance?`,
        "Show Guidance",
        "Dismiss"
      );

      if (action === "Show Guidance") {
        // Open a new untitled document with the full report and guidance
        const fullReport = `# SnapWright Architectural Integrity Report\n\n## Issues Found:\n\n${issueReport}\n\n## Architectural Guidelines:\n\n1. **No Circular References**: Page Object classes should not import their own PageFactory getters\n2. **Clean Separation**: Use PageFactory getters in test files, not within the Page Objects themselves\n3. **No Nested PageFactories**: PageFactory files should not be nested within each other\n\n## How to Fix:\n\n- Remove circular imports from Page Object files\n- Use SnapWright commands to properly structure your code\n- Keep PageFactory usage in test files and spec files\n\nFor more information, visit: https://github.com/your-repo/snapwright#architectural-guidelines`;

        const doc = await vscode.workspace.openTextDocument({
          content: fullReport,
          language: "markdown",
        });
        await vscode.window.showTextDocument(doc);
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error during architectural validation: ${error}`
    );
  }
}

// Helper function to find all PageFactory files in workspace
async function findAllPageFactoryFiles(
  workspacePath: string
): Promise<string[]> {
  const extensionConfig = getExtensionConfig();
  const pageFactoryFiles: string[] = [];

  function searchDirectory(dirPath: string) {
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
          searchDirectory(fullPath);
        } else if (
          item.includes("PageFactory") &&
          item.endsWith(extensionConfig.fileExtensions.pageFactory)
        ) {
          pageFactoryFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  searchDirectory(workspacePath);
  return pageFactoryFiles;
}

// Helper function to find all potential Page Object files
async function findAllPageObjectFiles(
  workspacePath: string
): Promise<string[]> {
  const extensionConfig = getExtensionConfig();
  const pageObjectFiles: string[] = [];

  function searchDirectory(dirPath: string) {
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
          searchDirectory(fullPath);
        } else if (
          item.endsWith(extensionConfig.fileExtensions.typescript) &&
          !item.includes("PageFactory")
        ) {
          // Check if it's a class file (potential Page Object)
          try {
            const content = fs.readFileSync(fullPath, "utf8");
            if (/export\s+class\s+\w+/.test(content)) {
              pageObjectFiles.push(fullPath);
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  searchDirectory(workspacePath);
  return pageObjectFiles;
}

// Validate a specific PageFactory for integrity issues
async function validatePageFactoryIntegrity(
  pageFactoryPath: string
): Promise<string[]> {
  const issues: string[] = [];
  const workspacePath =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
  const fileName = path.relative(workspacePath, pageFactoryPath);

  try {
    // Check for nesting issues
    const nestingCheck = checkForPageFactoryNesting(pageFactoryPath);

    if (nestingCheck.hasParentPageFactory) {
      issues.push(
        `🏗️ ${fileName}: Nested inside another PageFactory at ${path.relative(
          workspacePath,
          nestingCheck.parentPath || ""
        )}`
      );
    }

    if (nestingCheck.hasChildPageFactory) {
      issues.push(
        `🏗️ ${fileName}: Contains nested PageFactory at ${path.relative(
          workspacePath,
          nestingCheck.childPath || ""
        )}`
      );
    }

    // Check for orphaned imports
    const orphanedPageObjects = await extractPageObjectsFromPageFactory(
      pageFactoryPath
    );
    for (const pageObject of orphanedPageObjects) {
      const pageObjectPath = path.resolve(
        path.dirname(pageFactoryPath),
        pageObject.importPath + ".ts"
      );
      if (!fs.existsSync(pageObjectPath)) {
        issues.push(
          `🔗 ${fileName}: References non-existent Page Object "${pageObject.className}" at ${pageObject.importPath}`
        );
      }
    }
  } catch (error) {
    issues.push(`❌ ${fileName}: Error reading file - ${error}`);
  }

  return issues;
}
