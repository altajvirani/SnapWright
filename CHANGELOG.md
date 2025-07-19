# Changelog

All notable changes to the SnapWright POM Extension will be documented in this file.

## [1.0.0] - 2025-07-19

### Added

- **Create PageFactory Command**: Command palette option to create a PageFactory.ts file with singleton pattern
- **Add POM Classes to PageFactory Command**: Automatically scan directories and add POM classes to PageFactory
- **Code Snippets**:
  - `pfinst`: Creates PageFactory instance reference
  - `pfprop`: Creates POM property reference
  - `pfimport`: Imports PageFactory class
  - `pomclass`: Creates POM class template
- **Automatic Code Generation**:
  - Generates singleton getters for POM classes
  - Adds proper imports and type definitions
  - Creates private instance properties
- **Directory Selection**: Interactive directory picker for file creation
- **Multi-selection**: Choose multiple POM classes to add at once
- **Example POM Classes**: Sample LoginPage, HomePage, and ProfilePage classes
- **Documentation**: Comprehensive README and usage guide

### Features

- Singleton PageFactory pattern implementation
- Automatic POM class discovery and integration
- Type-safe TypeScript code generation
- VS Code Command Palette integration
- IntelliSense-friendly code snippets
- Cross-platform compatibility (Windows, macOS, Linux)

### Technical Details

- Built with TypeScript
- Uses VS Code Extension API
- Supports workspace folder navigation
- File system integration for code generation
- Error handling and user feedback
