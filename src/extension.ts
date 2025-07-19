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

  context.subscriptions.push(createPageFactoryCommand);
  context.subscriptions.push(addPOMToFactoryCommand);
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
  return `/**
 * PageFactory - Singleton class for managing Page Object Model instances
 * Generated by SnapWright POM Extension
 */
export class PageFactory {
    private static instance: PageFactory;

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    /**
     * Get the singleton instance of PageFactory
     */
    public static getInstance(): PageFactory {
        if (!PageFactory.instance) {
            PageFactory.instance = new PageFactory();
        }
        return PageFactory.instance;
    }

    // POM class properties will be added here
}

// Export singleton instance for easy access
export const pageFactory = PageFactory.getInstance();
`;
}

async function updatePageFactory(
  pageFactoryPath: string,
  selectedFiles: any[]
) {
  let content = fs.readFileSync(pageFactoryPath, "utf8");

  // Generate imports
  const imports: string[] = [];
  const properties: string[] = [];
  const getters: string[] = [];

  for (const file of selectedFiles) {
    const className = file.label;
    const relativePath = path.relative(
      path.dirname(pageFactoryPath),
      file.description
    );
    const importPath = relativePath.replace(/\\/g, "/").replace(".ts", "");

    imports.push(`import { ${className} } from './${importPath}';`);
    properties.push(
      `    private _${className.toLowerCase()}: ${className} | undefined;`
    );
    getters.push(`
    /**
     * Get singleton instance of ${className}
     */
    public get ${className.toLowerCase()}(): ${className} {
        if (!this._${className.toLowerCase()}) {
            this._${className.toLowerCase()} = new ${className}();
        }
        return this._${className.toLowerCase()};
    }`);
  }

  // Add imports at the top
  const importBlock = imports.join("\n");
  content = importBlock + "\n\n" + content;

  // Add properties after the constructor
  const constructorEndIndex = content.indexOf(
    "    }",
    content.indexOf("private constructor()")
  );
  if (constructorEndIndex !== -1) {
    const beforeConstructorEnd = content.substring(0, constructorEndIndex + 5);
    const afterConstructorEnd = content.substring(constructorEndIndex + 5);

    content =
      beforeConstructorEnd +
      "\n\n" +
      properties.join("\n") +
      afterConstructorEnd;
  }

  // Add getters before the last closing brace
  const lastBraceIndex = content.lastIndexOf("}");
  if (lastBraceIndex !== -1) {
    const beforeLastBrace = content.substring(0, lastBraceIndex);
    const afterLastBrace = content.substring(lastBraceIndex);

    content = beforeLastBrace + getters.join("\n") + "\n" + afterLastBrace;
  }

  // Write updated content
  fs.writeFileSync(pageFactoryPath, content);

  // Open the updated file
  const document = await vscode.workspace.openTextDocument(pageFactoryPath);
  await vscode.window.showTextDocument(document);
}

export function deactivate() {}
