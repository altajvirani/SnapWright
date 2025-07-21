import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  console.log("SnapWright extension is now active!");

  // Register command to create PageFactory
  let createPageFactoryCommand = vscode.commands.registerCommand(
    "snapwright.createPageFactory",
    async () => {
      await createPageFactory();
    }
  );

  // Register command to add POM classes to PageFactory
  let addPOMToFactoryCommand = vscode.commands.registerCommand(
    "snapwright.addPOMToFactory",
    async () => {
      await addPOMToFactory();
    }
  );

  // Register command to create POM class
  let createPOMClassCommand = vscode.commands.registerCommand(
    "snapwright.createPOMClass",
    async () => {
      await createPOMClass();
    }
  );

  // Register command to use POM from PageFactory
  let usePOMFromFactoryCommand = vscode.commands.registerCommand(
    "snapwright.usePOMFromFactory",
    async () => {
      await usePOMFromFactory();
    }
  );

  context.subscriptions.push(createPageFactoryCommand);
  context.subscriptions.push(addPOMToFactoryCommand);
  context.subscriptions.push(createPOMClassCommand);
  context.subscriptions.push(usePOMFromFactoryCommand);
}

async function createPageFactory() {
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

    const pageFactoryPath = path.join(selectedFolder.fsPath, "PageFactory.ts");

    // Check if file already exists
    if (fs.existsSync(pageFactoryPath)) {
      const overwrite = await vscode.window.showWarningMessage(
        "PageFactory.ts already exists. Do you want to overwrite it?",
        "Yes",
        "No"
      );
      if (overwrite !== "Yes") {
        return;
      }
    }

    // Create PageFactory template
    const pageFactoryTemplate = generatePageFactoryTemplate();

    // Write file
    fs.writeFileSync(pageFactoryPath, pageFactoryTemplate);

    // Open the created file
    const document = await vscode.workspace.openTextDocument(pageFactoryPath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(
      "PageFactory.ts created successfully!"
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error creating PageFactory: ${error}`);
  }
}

async function addPOMToFactory() {
  try {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder found");
      return;
    }

    // Check if PageFactory exists first - before asking user to select anything
    const pageFactoryPath = await findPageFactory(
      workspaceFolders[0].uri.fsPath
    );
    if (!pageFactoryPath) {
      vscode.window.showErrorMessage(
        "PageFactory.ts not found. Please create it first."
      );
      return;
    }

    // Show directory picker for POM classes
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

    // Let user select which POM classes to add
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
        placeHolder: "Select POM classes to add to PageFactory",
      }
    );

    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    // Update PageFactory with selected POM classes
    await updatePageFactory(pageFactoryPath, selectedFiles);

    vscode.window.showInformationMessage(
      `Added ${selectedFiles.length} POM class(es) to PageFactory!`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error adding POM classes: ${error}`);
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
 * PageFactory - Singleton class for managing Page Object Model instances
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

  // POM class properties will be added here
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
    let lastPOMIndex = -1;

    // Find _globalPage and any existing POM properties
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
        lastPOMIndex = i;
      }
    }

    if (lastPOMIndex !== -1) {
      // Insert after last existing POM property
      lines.splice(lastPOMIndex + 1, 0, ...properties);
    } else if (globalPageIndex !== -1) {
      // Insert after _globalPage - add blank line first, then properties
      lines.splice(globalPageIndex + 1, 0, "", ...properties);
    }

    content = lines.join("\n");
  }

  // Add getters before the comment line
  if (getters.length > 0) {
    const commentIndex = content.indexOf(
      "// POM class properties will be added here"
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
    `Successfully added ${imports.length} new POM class(es) to PageFactory!`
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
    // Try to find PageFactory.ts in the workspace
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

// Function to create a new POM class
async function createPOMClass() {
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
        "Enter the POM class name (e.g., Home, Login, HomePage, LoginPage)",
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

    // Generate POM class content
    const pomContent = generatePOMClassTemplate(className);

    // Write the file
    fs.writeFileSync(filePath, pomContent);

    // Open the new file
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);

    vscode.window.showInformationMessage(
      `Successfully created ${className}.ts POM class!`
    );
  } catch (error) {
    console.error("Error creating POM class:", error);
    vscode.window.showErrorMessage("Failed to create POM class");
  }
}

// Function to generate POM class template
function generatePOMClassTemplate(className: string): string {
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

// New command to use POM from PageFactory with interactive selection
async function usePOMFromFactory() {
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

    // Extract POM getters from PageFactory
    const pomGetters = await extractPOMGetters(pageFactoryPath);
    if (pomGetters.length === 0) {
      vscode.window.showErrorMessage("No POM getters found in PageFactory.ts");
      return;
    }

    // Create quick pick items with POM options
    const quickPickItems: vscode.QuickPickItem[] = [];

    for (const getter of pomGetters) {
      const pomName = getter.replace("get", ""); // Keep original case
      const camelCaseName = pomName.charAt(0).toLowerCase() + pomName.slice(1); // Convert to camelCase

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
      title: "Use POM from PageFactory",
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

// Extract POM getter methods from PageFactory
async function extractPOMGetters(pageFactoryPath: string): Promise<string[]> {
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
