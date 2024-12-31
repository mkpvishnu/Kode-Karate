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
- Utility tools for API testing workflows

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

### Utilities

The extension provides helpful utilities to enhance your API testing workflow:

#### Request to cURL Converter
Convert Karate request logs to cURL commands for easy debugging and sharing:

1. Click on the "Request -> cURL" option in the Utilities view
2. Paste your Karate request log in the input area. Example format:
   ```
   1 > POST http://example.com
   1 > Accept: application/json
   1 > Content-Type: application/json
   {"key": "value"}
   ```
3. Click "Convert to cURL" to generate the equivalent cURL command
4. Copy the generated command to use in terminal or share with others

#### Response Diff Tool
Compare two API responses to identify differences:

1. Click on "Response Diff Tool" in the Utilities view
2. In the split view:
   - Left panel: Paste your first JSON response
   - Right panel: Paste your second JSON response
3. Use "Format JSON" buttons to prettify each response (optional)
4. Click "Compare" to see the differences
5. The tool will highlight:
   - Value mismatches (orange)
   - Type mismatches (red)
   - Missing fields in either response (green/blue)
   - Exact path to each difference

#### JWT Tool
A comprehensive JWT (JSON Web Token) encoder and decoder similar to jwt.io:

1. **Decode Mode**:
   - Paste any JWT token to instantly see:
     - Decoded Header (pink background)
     - Decoded Payload (purple background)
     - Signature section
   - Human-readable timestamps for:
     - Expiration time (exp)
     - Issued at (iat)
     - Not before (nbf)
   - Validate token signature with secret key
   - Check token expiration status

2. **Encode Mode**:
   - Create new JWT tokens with:
     - Customizable header
     - Customizable payload
     - Multiple signing algorithms (HS256, HS384, HS512)
     - Secret key input
   - Format JSON functionality for easy editing
   - Copy generated token with one click

## Bug Explorer
#### Configurable JSON paths for:

- Status field
- Title field
- Link field

#### Status mapping to translate API-specific statuses to desired display values:

```json
{
  "IN_PROGRESS": "In Progress",
  "DONE": "Closed",
  "TODO": "Open"
}
```

#### Supports nested paths using dot notation:

```
data.status
fields.summary.text
_embedded.issue.status
```


#### Example usage for different bug trackers:

##### For Jira:

```json
jsonCopy{
  "statusPath": "fields.status.name",
  "titlePath": "fields.summary",
  "linkPath": "self",
  "statusMapping": {
    "In Progress": "In Progress",
    "Done": "Closed",
    "To Do": "Open"
  }
}
```

##### For GitHub Issues:
```json
jsonCopy{
  "statusPath": "state",
  "titlePath": "title",
  "linkPath": "html_url",
  "statusMapping": {
    "open": "Open",
    "closed": "Closed"
  }
}
```

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

#### 1.2.0
- Added Response Diff Tool in utilities section
- Enhanced JSON comparison capabilities
- Visual diff highlighting for API responses

#### 1.3.0
- Added JWT tool
- UI optimization for Utilities

### Note:
This extension is not sponsored by Karate or anyway associated with the devs of karate DSL. They are awesome people and they have their own official extension available for both vscode and IntteliJ. Please check out there for official support -> https://www.karatelabs.io/

## Contributing

We welcome contributions!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.