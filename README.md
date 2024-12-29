# Kode Karate
<img src="https://github.com/mkpvishnu/Kode-Karate/blob/main/resources/karate.jpeg" alt="Logo" width="900" height="700"/>

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

#### 0.0.1

Initial release of Karate Runner:
- Basic test running capabilities
- Feature explorer
- Run history
- Automatic JAR management

#### 1.0.0

Full release of Karate Runner:
- Better Feature Explorer
- Better Run History
- Added syntax highlight support (Support is added from https://github.com/kirksl/karate-runner. Thanks to the devs of this extension for their extensive work in this.)
- Better and more seamless output format.
- Fixed some critical bugs

#### 1.1.0
- Add a utilities view
- New utility for converting request logs to curl commands

### Note:
This extension is not sponsored by Karate or anyway associated with the devs of karate DSL. They are awesome people and they have their own official extension available for both vscode and IntteliJ.Please check out there for official support -> https://www.karatelabs.io/

## Contributing

We welcome contributions!
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
