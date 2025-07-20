import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  console.log("SnapWright POM Extension is now active!");

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

  // Register command for smart PageFactory instance creation
  let createPageFactoryInstanceCommand = vscode.commands.registerCommand(
    "snapwright.createPageFactoryInstance",
    async () => {
      await createPageFactoryInstance();
    }
  );

  context.subscriptions.push(createPageFactoryCommand);
  context.subscriptions.push(addPOMToFactoryCommand);
  context.subscriptions.push(createPageFactoryInstanceCommand);
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
      tsFiles.map((file) => ({
        label: path.basename(file, ".ts"),
        description: file,
        picked: true,
      })),
      {
        canPickMany: true,
        placeHolder: "Select POM classes to add to PageFactory",
      }
    );

    if (!selectedFiles || selectedFiles.length === 0) {
      return;
    }

    // Find PageFactory.ts file
    const pageFactoryPath = await findPageFactory(
      workspaceFolders[0].uri.fsPath
    );
    if (!pageFactoryPath) {
      vscode.window.showErrorMessage(
        "PageFactory.ts not found. Please create it first."
      );
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
      } else if (item.endsWith(".ts") && item !== "PageFactory.ts") {
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
 * Generated by SnapWright POM Extension
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
    const className = file.label;
    const relativePath = path.relative(
      path.dirname(pageFactoryPath),
      file.description
    );
    const importPath = relativePath.replace(/\\/g, "/").replace(".ts", "");
    const importStatement = `import { ${className} } from './${importPath}';`;
    const propertyName = `_${className.toLowerCase()}`;

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
    getters.push(`
  public get ${className.toLowerCase()}(): ${className} {
    if (!this.${propertyName}) this.${propertyName} = new ${className}();

    return this.${propertyName};
  }`);
    exports.push(
      `export const ${className.toLowerCase()} = PageFactory.instance.${className.toLowerCase()};`
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

  // Add properties after the constructor
  if (properties.length > 0) {
    const constructorEndIndex = content.indexOf(
      "    }",
      content.indexOf("private constructor()")
    );
    if (constructorEndIndex !== -1) {
      const beforeConstructorEnd = content.substring(
        0,
        constructorEndIndex + 5
      );
      const afterConstructorEnd = content.substring(constructorEndIndex + 5);

      content =
        beforeConstructorEnd +
        "\n\n" +
        properties.join("\n") +
        afterConstructorEnd;
    }
  }

  // Add getters before the last closing brace
  if (getters.length > 0) {
    const lastBraceIndex = content.lastIndexOf("}");
    if (lastBraceIndex !== -1) {
      const beforeLastBrace = content.substring(0, lastBraceIndex);
      const afterLastBrace = content.substring(lastBraceIndex);

      content = beforeLastBrace + getters.join("\n") + "\n" + afterLastBrace;
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
      textToInsert += `import { pageFactory } from '${pageFactoryPath}';\n\n`;
    } else {
      textToInsert += `import { pageFactory } from './PageFactory';\n\n`;
    }
  }

  // Add the instance creation with new pattern
  textToInsert += "const pf = pageFactory;";

  // Insert at cursor position
  const position = editor.selection.active;
  await editor.edit((editBuilder) => {
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

export function deactivate() {}
