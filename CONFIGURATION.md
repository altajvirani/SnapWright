# SnapWright Configuration

All code generation is now configurable through VS Code settings.

## Settings

```json
{
  "snapwright.fileExtensions.pageObject": ".page.ts",
  "snapwright.fileExtensions.pageFactory": ".ts",
  "snapwright.fileExtensions.typescript": ".ts",
  "snapwright.namingConventions.classSuffix": "Page",
  "snapwright.namingConventions.propertyPrefix": "_",
  "snapwright.namingConventions.fileNameCase": "camelCase",
  "snapwright.validation.classNamePattern": "^[a-zA-Z][a-zA-Z0-9]*$",
  "snapwright.validation.fileNamePattern": "^[a-zA-Z][a-zA-Z0-9]*$",
  "snapwright.validation.preventNesting": true,
  "snapwright.importPaths.defaultPrefix": "./",
  "snapwright.importPaths.useRelativePaths": true,
  "snapwright.templates.pageFactory": "",
  "snapwright.templates.pageObjectClass": ""
}
```

## File Name Cases

- `camelCase`: `homePage.ts`
- `kebab-case`: `home-page.ts`
- `snake_case`: `home_page.ts`

## Architectural Boundaries

Set `"snapwright.validation.preventNesting": false` to allow nested PageFactories (not recommended).

## Custom Templates

Use `${className}` placeholder in templates.
