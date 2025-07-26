import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// Global variable to store extension context for state management
let extensionContext: vscode.ExtensionContext;

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
    "snapwright.addPOMToFactory",
    async () => {
      await addPageObjectToFactory();
    }
  );

  // Register command to create Page Object class
  let createPageObjectClassCommand = vscode.commands.registerCommand(
    "snapwright.createPOMClass",
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

  context.subscriptions.push(createPageFactoryCommand);
  context.subscriptions.push(addPageObjectToFactoryCommand);
  context.subscriptions.push(createPageObjectClassCommand);
  context.subscriptions.push(usePageObjectFromFactoryCommand);
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

    // Step 2: Get user-defined name for the PageFactory
    let pageFactoryName: string | undefined;
    let isValidName = false;

    while (!isValidName) {
      pageFactoryName = await vscode.window.showInputBox({
        prompt: "Enter a unique name for your PageFactory",
        placeHolder: "e.g., MainPageFactory, TestPageFactory",
        validateInput: (value: string) => {
          if (!value || value.trim().length === 0) {
            return "PageFactory name cannot be empty";
          }
          if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value.trim())) {
            return "PageFactory name must start with a letter and contain only letters and numbers";
          }
          return null;
        },
      });

      if (!pageFactoryName) {
        return; // User cancelled
      }

      pageFactoryName = pageFactoryName.trim();

      // Step 3: Validate uniqueness in directory
      const pageFactoryPath = path.join(
        selectedFolder.fsPath,
        `${pageFactoryName}.ts`
      );

      if (fs.existsSync(pageFactoryPath)) {
        const action = await vscode.window.showWarningMessage(
          `A PageFactory named "${pageFactoryName}.ts" already exists in this directory. Please choose a different name or overwrite the existing file.`,
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
        // Step 4: Check uniqueness in saved PageFactory list
        const savedFactories = getSavedPageFactoryPaths();
        const nameExists = savedFactories.some(
          (factory: any) =>
            factory.label.toLowerCase() === pageFactoryName!.toLowerCase()
        );

        if (nameExists) {
          vscode.window.showErrorMessage(
            `A PageFactory with the name "${pageFactoryName}" already exists in your saved list. Please choose a different name.`
          );
          // Continue the loop to get a new name
        } else {
          isValidName = true;
        }
      }
    }

    const pageFactoryPath = path.join(
      selectedFolder.fsPath,
      `${pageFactoryName}.ts`
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
      `PageFactory "${pageFactoryName}.ts" created successfully and saved to your PageFactory list!`
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

    // Let user select which Page Object classes to add
    const selectedFiles = await vscode.window.showQuickPick(
      tsFiles.map((file) => {
        // Extract class name from file content for better display
        try {
          const fileContent = fs.readFileSync(file, "utf8");
          const classMatch = fileContent.match(/export\s+class\s+(\w+)/);
          const className = classMatch
            ? classMatch[1]
            : path.basename(file, ".ts");

          return {
            label: className,
            description: file,
            detail: `File: ${path.basename(file)}`,
            picked: true,
          };
        } catch (error) {
          return {
            label: path.basename(file, ".ts"),
            description: file,
            detail: `File: ${path.basename(file)}`,
            picked: true,
          };
        }
      }),
      {
        canPickMany: true,
        placeHolder: "Select Page Object classes to add to PageFactory",
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

  function walkDir(currentPath: string) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (
        item.endsWith(".ts") &&
        item !== "PageFactory.ts" &&
        (item.endsWith(".page.ts") || !item.includes(".page."))
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
        } else if (item === "PageFactory.ts") {
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
    const importPath = relativePath.replace(/\\/g, "/").replace(".ts", "");
    const importStatement = `import { ${className} } from './${importPath}';`;
    const propertyName = `_${classNameToCamelCase(className)}`;
    const getterName = classNameToCamelCase(className);

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
      textToInsert += `import { getHomePage, getLoginPage } from '${pageFactoryPath}';\n\n`;
    } else {
      textToInsert += `import { getHomePage, getLoginPage } from './PageFactory';\n\n`;
    }
  }

  // Add example usage with new pattern
  textToInsert += `// Option 1: Pass page for explicit page setting
await getHomePage(page).navigate();

// Option 2: Use without page if already set
await getLoginPage().login("user", "pass");`;

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
    const relativePath = path.relative(
      path.dirname(currentFilePath),
      pageFactoryPath
    );
    return relativePath.replace(/\\/g, "/").replace(".ts", "");
  }

  // Fallback to old method if no saved paths
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return null;

  const pageFactoryPath = await findPageFactory(workspaceFolders[0].uri.fsPath);
  if (!pageFactoryPath) return null;

  const relativePath = path.relative(
    path.dirname(currentFilePath),
    pageFactoryPath
  );
  return relativePath.replace(/\\/g, "/").replace(".ts", "");
}

// Helper function to convert class name to camelCase
function classNameToCamelCase(className: string): string {
  return className.charAt(0).toLowerCase() + className.slice(1);
}

// Helper function to process class name and generate filename
function processClassAndFileName(userInput: string): {
  className: string;
  fileName: string;
} {
  const trimmedInput = userInput.trim();

  // Check if input already ends with "Page"
  const endsWithPage = trimmedInput.toLowerCase().endsWith("page");

  // Generate class name (always ends with "Page")
  const className = endsWithPage ? trimmedInput : trimmedInput + "Page";

  // Generate filename (remove "Page" if present, convert to camelCase, add .page.ts)
  let baseFileName;
  if (endsWithPage) {
    // Remove "Page" from the end
    baseFileName = trimmedInput.slice(0, -4); // Remove last 4 characters ("Page")
  } else {
    baseFileName = trimmedInput;
  }

  // Convert to camelCase for filename
  const camelCaseFileName =
    baseFileName.charAt(0).toLowerCase() + baseFileName.slice(1);
  const fileName = `${camelCaseFileName}.page.ts`;

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
    const userInput = await vscode.window.showInputBox({
      prompt:
        "Enter the Page Object class name (e.g., Home, Login, HomePage, LoginPage)",
      placeHolder: "Home",
      validateInput: (value: string) => {
        if (!value || value.trim() === "") {
          return "Class name cannot be empty";
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return "Class name must start with uppercase letter and contain only letters and numbers";
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
      `Successfully created ${className}.ts Page Object class!`
    );
  } catch (error) {
    console.error("Error creating Page Object class:", error);
    vscode.window.showErrorMessage("Failed to create Page Object class");
  }
}

// Function to generate Page Object class template
function generatePageObjectClassTemplate(className: string): string {
  return `// import page from pagefactory here by default so as to allow the commands to execute upon it
import { page } from '../PageFactory';

export class ${className} {
    // other properties, eg. selectors or elements.

    public constructor() {
        // setting the properties with the values here.
    }
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
        "PageFactory.ts not found. Please create it first."
      );
      return;
    }

    // Extract Page Object getters from PageFactory
    const pageObjectGetters = await extractPageObjectGetters(pageFactoryPath);
    if (pageObjectGetters.length === 0) {
      vscode.window.showErrorMessage(
        "No Page Object getters found in PageFactory.ts"
      );
      return;
    }

    // Check for circular reference - if current file is a Page Object in the PageFactory
    const circularGetter = await detectCircularReference(
      editor.document.uri.fsPath,
      pageFactoryPath
    );

    // Filter out the circular reference getter if found - completely silent
    const availableGetters = circularGetter
      ? pageObjectGetters.filter((getter) => getter !== circularGetter)
      : pageObjectGetters;

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
      placeHolder: "Select POM initialization pattern",
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
  const relativePath = path.relative(
    path.dirname(currentFilePath),
    pageFactoryPath
  );
  return relativePath.startsWith(".")
    ? relativePath.replace(/\\/g, "/").replace(".ts", "")
    : "./" + relativePath.replace(/\\/g, "/").replace(".ts", "");
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
      return null; // Not imported in PageFactory
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

    return null;
  } catch (error) {
    return null; // Error reading files, assume no circular reference
  }
}

// Extract POM getter methods from PageFactory
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
      description: "Select a new PageFactory.ts file",
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

  const fileUri = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    defaultUri: workspaceFolders[0].uri,
    filters: {
      "TypeScript Files": ["ts"],
    },
    title: "Select PageFactory.ts file",
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
