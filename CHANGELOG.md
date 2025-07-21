# Change Log

All notable changes to the "SnapWright" extension will be documented in this file.

## [1.3.0] - 2025-01-22

### 🚀 Major Features

- **Command Palette Integration**: New interactive "Use POM from PageFactory" command
- **Dynamic POM Discovery**: Automatically reads your PageFactory and suggests available POM classes
- **Smart Import Management**: Intelligent import positioning that respects comments and ESLint configs
- **Interactive Workflow**: Step-by-step process with user cursor placement control

### ✨ New Features

- **Real-time POM Detection**: Extension reads actual PageFactory exports dynamically
- **camelCase Variables**: Proper naming conventions (getTopicsPage → topicsPage)
- **Flexible Page Parameters**: Choose between `getTopicsPage()` and `getTopicsPage(page)`
- **Worker Isolation Support**: Enhanced `ensurePageSet()` method for parallel test execution
- **Import Intelligence**: Auto-detects existing imports and calculates relative paths

### 🔧 Improvements

- **Better User Experience**: Interactive selection with clear descriptions
- **Cursor Control**: User decides exactly where const assignments are placed
- **Smart Positioning**: Imports placed after file headers, comments, and ESLint configs
- **Error Handling**: Helpful error messages and validation

### 🗑️ Removed

- **Hardcoded Typing Patterns**: Removed `pfpom`, `pfpompg` typing completions
- **Static Snippets**: Replaced hardcoded snippets with dynamic discovery
- **Manual Triggers**: No more memorizing trigger patterns

### 🛠️ Technical

- **Enhanced PageFactory**: Added `ensurePageSet(page?: Page)` helper method
- **Worker Thread Safety**: Support for parallel test execution
- **Improved Binding**: Proper method binding for exported functions

## [1.2.0] - 2025-01-20

### Changed

- **CamelCase Property Naming**: POM class properties now use camelCase naming convention (HomePage → homePage, LoginPage → loginPage)
- **Consistent Naming**: Updated from snake_case to camelCase for better JavaScript/TypeScript convention

### Features

- **CamelCase Convention**: HomePage becomes homePage, LoginPage becomes loginPage, etc.
- **Private Instance Variables**: Properly generates private properties with camelCase naming
- **Better Conventions**: Follows standard JavaScript/TypeScript naming patterns

## [1.1.0] - 2025-01-20

### Added

- **Create POM Class Command**: New command palette option to create POM class files with proper structure and PageFactory import
- **Snake Case Property Naming**: POM class properties now use snake_case naming convention (HomePage → home_page)
- **Enhanced Property Generation**: Fixed missing private instance variables in PageFactory for POM classes

### Improved

- **Better Naming Convention**: Property names in PageFactory now follow snake_case pattern for consistency
- **Accurate POM Template**: POM class template matches the exact structure requested with proper comments
- **Smart Property Detection**: Enhanced duplicate detection for snake_case properties

### Features

- **Create POM Class**: Generate POM class files with PageFactory import and proper structure
- **Snake Case Convention**: HomePage becomes home_page, LoginPage becomes login_page, etc.
- **Private Instance Variables**: Properly generates private properties for each POM class in PageFactory

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
