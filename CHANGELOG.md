# Change Log

All notable changes to the "SnapWright POM Generator" extension will be documented in this file.

## [1.0.0] - 2025-01-20

### Added

- **Playwright Integration**: Full support for Playwright Page objects with TypeScript types
- **PageFactory Generation**: Create PageFactory with modern singleton pattern and direct exports
- **Smart POM Integration**: Add existing POM classes to PageFactory with duplicate detection
- **Code Snippets**: 6 essential snippets for rapid development (`pfinst`, `pfsetup`, `pfpage`, `pfimport`, `pfprop`, `pomclass`)
- **Global Page Management**: Set page once, use everywhere across all POM classes
- **Enhanced Duplicate Detection**: Prevents duplicate imports and properties
- **Smart Import Management**: Auto-detects existing imports and resolves relative paths
- **Command Palette Integration**: Three main commands for complete workflow
- **TypeScript Support**: Full TypeScript integration with proper type safety

### Features

- **Create PageFactory**: Generate PageFactory with Playwright integration
- **Add POM Classes**: Automatically scan and add POM classes with smart detection
- **Create PageFactory Instance**: Smart import handling for PageFactory references
- **Direct Exports**: Import exactly what you need from PageFactory
- **Auto-instantiation**: POM classes created on first access and reused

### Documentation

- Comprehensive usage guide with examples
- Best practices for project organization
- Troubleshooting guide
- Example workflows for different scenarios
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
