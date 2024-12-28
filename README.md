# Karate Runner for VS Code

A Visual Studio Code extension that provides comprehensive support for running and managing Karate API tests.

## Features

- Run Karate tests directly from VS Code
- Automatic Karate JAR management
- Feature file explorer
- Test run history with HTML reports
- Syntax highlighting for .feature files
- Run individual scenarios or entire feature files

## Requirements

- Java 11 or higher
- Visual Studio Code 1.60.0 or higher

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Karate Runner"
4. Click Install

## Usage

### Running Tests

1. Open a .feature file
2. Use one of these methods to run tests:
   - Click the "Run Test" button in the editor title bar
   - Use the command palette (Ctrl+Shift+P) and search for "Karate: Run Test"
   - Right-click in the editor and select "Run Test"

### Feature Explorer

View and manage your Karate feature files in the dedicated sidebar:

1. Click the Karate icon in the activity bar
2. Browse your feature files in the Feature Explorer
3. Click on a feature to open it
4. Use the context menu to run tests

### Run History

Keep track of your test runs:

1. Open the Run History view in the Karate sidebar
2. View past test runs with their results
3. Click "View Report" to open the HTML report
4. Use "Clear History" to remove old test runs

## Extension Settings

The extension automatically manages most settings, but you can configure:

- Java path (if not automatically detected)
- Karate JAR version (defaults to latest)

## Known Issues

Please report issues on our [GitHub repository](link-to-your-repo/issues).

## Release Notes

### 0.0.1

Initial release of Karate Runner:
- Basic test running capabilities
- Feature explorer
- Run history
- Automatic JAR management

## Contributing

We welcome contributions! Please see our [contributing guidelines](link-to-your-repo/CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.