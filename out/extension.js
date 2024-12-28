"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const jarManager_1 = require("./jarManager");
const javaFinder_1 = require("./javaFinder");
const child_process_1 = require("child_process");
const config_1 = require("./config");
function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('Karate Runner');
    const jarManager = new jarManager_1.KarateJarManager(context, outputChannel);
    let karateJarPath;
    let java11Path;
    // Find Java 11 at startup
    javaFinder_1.JavaFinder.findJava11().then(path => {
        java11Path = path;
        outputChannel.appendLine(`Found Java 11 at: ${path}`);
    }).catch((error) => {
        outputChannel.appendLine(`Warning: ${error.message}`);
        vscode.window.showWarningMessage('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
    });
    // Register CodeLens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider('karate', new KarateCodeLensProvider());
    // Register configuration change listener
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('karateRunner.logging')) {
            await config_1.ConfigurationManager.handleConfigChange();
        }
    }));
    async function runKarate(filePath, scenarioName) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!java11Path) {
                    java11Path = await javaFinder_1.JavaFinder.findJava11();
                }
                if (!karateJarPath) {
                    karateJarPath = await jarManager.ensureJar();
                }
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    throw new Error('No workspace folder found');
                }
                outputChannel.clear();
                outputChannel.show(true);
                outputChannel.appendLine('Running Karate test...\n');
                const loggingConfig = config_1.ConfigurationManager.getLoggingConfig();
                const args = ['-jar', karateJarPath, filePath];
                // Add logback configuration if using logback mode
                if (loggingConfig.outputMode === 'logback' && loggingConfig.logbackFile) {
                    const logbackPath = path.join(workspaceFolder.uri.fsPath, loggingConfig.logbackFile);
                    if (fs.existsSync(logbackPath)) {
                        args.unshift(`-Dlogback.configurationFile=${loggingConfig.logbackFile}`);
                        outputChannel.appendLine(`Using logback configuration: ${logbackPath}\n`);
                    }
                    else {
                        outputChannel.appendLine(`Warning: Logback file not found: ${logbackPath}\n`);
                        outputChannel.appendLine('Falling back to extension output mode\n');
                    }
                }
                if (scenarioName) {
                    args.push('--name', scenarioName);
                }
                outputChannel.appendLine(`Running command: ${java11Path} ${args.join(' ')}\n`);
                const process = (0, child_process_1.spawn)(java11Path, args, {
                    cwd: workspaceFolder.uri.fsPath
                });
                let testFailed = false;
                let isCollectingJson = false;
                let jsonOutput = '';
                process.stdout.on('data', (data) => {
                    const output = data.toString();
                    const lines = output.split('\n');
                    // Only process output if we're in extension mode or if logback file is not found
                    if (loggingConfig.outputMode === 'extension' || !loggingConfig.logbackFile) {
                        lines.forEach((line) => {
                            line = line.replace(/\u001b\[\d+m/g, '').trim();
                            if (!line)
                                return;
                            if (line.includes('match failed')) {
                                testFailed = true;
                                outputChannel.appendLine('❌ ' + line);
                            }
                            else if (line.startsWith('Given ') || line.startsWith('When ') ||
                                line.startsWith('Then ') || line.startsWith('And ') ||
                                line.startsWith('* ')) {
                                outputChannel.appendLine('\n► ' + line);
                            }
                            else if (line.includes('Response:')) {
                                outputChannel.appendLine('\n🔍 Response:');
                                isCollectingJson = true;
                                jsonOutput = '';
                            }
                            else if (isCollectingJson && (line.startsWith('{') || line.startsWith('}'))) {
                                jsonOutput += line + '\n';
                                if (line.startsWith('}') && line.length === 1) {
                                    isCollectingJson = false;
                                    try {
                                        const formattedJson = JSON.stringify(JSON.parse(jsonOutput), null, 2);
                                        outputChannel.appendLine(formattedJson);
                                    }
                                    catch {
                                        outputChannel.appendLine(jsonOutput);
                                    }
                                }
                            }
                            else if (line.includes('scenarios:') && line.includes('failed:')) {
                                const failCount = line.match(/failed:\s+(\d+)/);
                                if (failCount && parseInt(failCount[1]) > 0) {
                                    testFailed = true;
                                }
                                outputChannel.appendLine('\n📊 Test Results:');
                                outputChannel.appendLine(line);
                            }
                            else if (isCollectingJson) {
                                jsonOutput += line + '\n';
                            }
                            else if (!line.includes('INFO') && !line.includes('karate-summary')) {
                                outputChannel.appendLine(line);
                            }
                        });
                    }
                    else {
                        // In logback mode with valid config, output raw test output
                        outputChannel.append(output);
                    }
                });
                process.stderr.on('data', (data) => {
                    outputChannel.appendLine('\n⚠️ Error:');
                    outputChannel.appendLine(data.toString());
                    testFailed = true;
                });
                process.on('close', (code) => {
                    outputChannel.appendLine('\n' + '='.repeat(80));
                    if (testFailed) {
                        outputChannel.appendLine('❌ Test Failed');
                        reject(new Error('Test execution failed'));
                    }
                    else {
                        outputChannel.appendLine('✅ Test Passed');
                        resolve();
                    }
                    outputChannel.appendLine('='.repeat(80) + '\n');
                    // Try to open HTML report if it exists
                    const reportPath = path.join(workspaceFolder.uri.fsPath, 'target', 'karate-reports', 'karate-summary.html');
                    if (fs.existsSync(reportPath)) {
                        vscode.env.openExternal(vscode.Uri.file(reportPath));
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    // Register commands
    let runScenarioCommand = vscode.commands.registerCommand('karate-runner.runScenario', async (line, filePath) => {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const scenarioName = getScenarioName(document, line);
            if (scenarioName) {
                await runKarate(filePath, scenarioName);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            vscode.window.showErrorMessage(`Failed to run scenario: ${errorMessage}`);
            outputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });
    let runTestCommand = vscode.commands.registerCommand('karate-runner.runTest', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }
            const document = editor.document;
            if (!document.fileName.endsWith('.feature')) {
                vscode.window.showErrorMessage('Not a Karate feature file');
                return;
            }
            await runKarate(document.fileName);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            vscode.window.showErrorMessage(`Failed to run test: ${errorMessage}`);
            outputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });
    // Register completion provider
    let completionProvider = vscode.languages.registerCompletionItemProvider('karate', {
        provideCompletionItems(document, position) {
            const keywords = [
                'Feature:', 'Scenario:', 'Given', 'When', 'Then', 'And', 'But',
                'Background:', 'call', 'callonce', 'def', 'print', 'assert',
                'path', 'url', 'method', 'status', 'match', 'contains'
            ];
            return keywords.map(keyword => {
                const completion = new vscode.CompletionItem(keyword);
                completion.kind = vscode.CompletionItemKind.Keyword;
                return completion;
            });
        }
    });
    // Create status bar item with dropdown for output mode selection
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(beaker) Karate";
    statusBarItem.tooltip = "Run Karate Tests";
    statusBarItem.command = 'karate-runner.runTest';
    statusBarItem.show();
    // Register hover provider
    let hoverProvider = vscode.languages.registerHoverProvider('karate', {
        provideHover(document, position) {
            const line = document.lineAt(position.line);
            const word = document.getText(document.getWordRangeAtPosition(position));
            const hoverInfo = {
                'Feature': 'Top level keyword that defines a test feature',
                'Scenario': 'Defines a test scenario within a feature',
                'Given': 'Sets up the initial test state',
                'When': 'Describes the action being tested',
                'Then': 'Describes the expected outcome',
                'And': 'Adds additional context to Given, When, or Then',
                'But': 'Adds negative context to Given, When, or Then',
                'Background': 'Defines steps that run before each scenario',
                'match': 'Asserts that a value matches the expected result',
                'contains': 'Checks if one value contains another',
                'print': 'Prints a value for debugging',
                'def': 'Defines a variable',
                'path': 'Sets the URL path',
                'url': 'Sets the base URL',
                'method': 'Sets the HTTP method (get, post, etc.)',
                'status': 'Asserts the HTTP response status code'
            };
            if (hoverInfo[word]) {
                return new vscode.Hover(hoverInfo[word]);
            }
        }
    });
    // Subscribe to all disposables
    context.subscriptions.push(runTestCommand, runScenarioCommand, completionProvider, codeLensProvider, hoverProvider, statusBarItem, configureLoggingCommand);
}
exports.activate = activate;
class KarateCodeLensProvider {
    provideCodeLenses(document) {
        const codeLenses = [];
        const text = document.getText();
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('Scenario:')) {
                const range = new vscode.Range(i, 0, i, line.length);
                const command = {
                    title: '▶ Run Scenario',
                    command: 'karate-runner.runScenario',
                    arguments: [i, document.uri.fsPath]
                };
                codeLenses.push(new vscode.CodeLens(range, command));
            }
        }
        return codeLenses;
    }
}
// Register configure logging command
let configureLoggingCommand = vscode.commands.registerCommand('karate-runner.configureLogging', async () => {
    await config_1.ConfigurationManager.configureLoggingUI();
});
function getScenarioName(document, line) {
    const text = document.lineAt(line).text;
    const match = text.match(/Scenario:(.+)/);
    return match ? match[1].trim() : undefined;
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map