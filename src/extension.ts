import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { KarateJarManager } from './jarManager';
import { JavaFinder } from './javaFinder';
import { spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Karate Runner');
    const jarManager = new KarateJarManager(context, outputChannel);
    let karateJarPath: string | undefined;
    let java11Path: string | undefined;

    // Find Java 11 at startup
    JavaFinder.findJava11().then(path => {
        java11Path = path;
        outputChannel.appendLine(`Found Java 11 at: ${path}`);
    }).catch((error: Error) => {
        outputChannel.appendLine(`Warning: ${error.message}`);
        vscode.window.showWarningMessage('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
    });

    // Register CodeLens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider('karate', new KarateCodeLensProvider());

    async function runKarate(filePath: string, scenarioName?: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!java11Path) {
                    java11Path = await JavaFinder.findJava11();
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

                const args = [
                    '-Dlogback.configurationFile=logback-test.xml',
                    '-jar',
                    karateJarPath,
                    filePath
                ];

                if (scenarioName) {
                    args.push('--name', scenarioName);
                }

                outputChannel.appendLine(`Running command: ${java11Path} ${args.join(' ')}\n`);

                const process = spawn(java11Path, args, {
                    cwd: workspaceFolder.uri.fsPath
                });

                let testFailed = false;
                let currentStep = '';
                let currentOutput = '';
                let isCollectingJson = false;
                let jsonOutput = '';

                process.stdout.on('data', (data) => {
                    const output = data.toString();
                    const lines = output.split('\n');
                    
                    lines.forEach((line: string) => {
                        line = line.replace(/\u001b\[\d+m/g, '').trim();
                        
                        if (!line) return;

                        // Handle different types of output
                        if (line.includes('match failed')) {
                            testFailed = true;
                            outputChannel.appendLine('❌ ' + line);
                        }
                        else if (line.startsWith('Given ') || line.startsWith('When ') || 
                                line.startsWith('Then ') || line.startsWith('And ') || 
                                line.startsWith('* ')) {
                            currentStep = line;
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
                                } catch {
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
                    } else {
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
            } catch (error) {
                reject(error);
            }
        });
    }

    // Register commands
    let runScenarioCommand = vscode.commands.registerCommand('karate-runner.runScenario', async (line: number, filePath: string) => {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const scenarioName = getScenarioName(document, line);
            
            if (scenarioName) {
                await runKarate(filePath, scenarioName);
            }
        } catch (error: unknown) {
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
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            vscode.window.showErrorMessage(`Failed to run test: ${errorMessage}`);
            outputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });

    // Register completion provider
    let completionProvider = vscode.languages.registerCompletionItemProvider(
        'karate',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
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
        }
    );

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(beaker) Karate";
    statusBarItem.tooltip = "Run Karate Tests";
    statusBarItem.command = 'karate-runner.runTest';
    statusBarItem.show();

    // Register hover provider
    let hoverProvider = vscode.languages.registerHoverProvider('karate', {
        provideHover(document: vscode.TextDocument, position: vscode.Position) {
            const line = document.lineAt(position.line);
            const word = document.getText(document.getWordRangeAtPosition(position));

            const hoverInfo: { [key: string]: string } = {
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
    context.subscriptions.push(
        runTestCommand,
        runScenarioCommand,
        completionProvider,
        codeLensProvider,
        hoverProvider,
        statusBarItem
    );
}

class KarateCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
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

function getScenarioName(document: vscode.TextDocument, line: number): string | undefined {
    const text = document.lineAt(line).text;
    const match = text.match(/Scenario:(.+)/);
    return match ? match[1].trim() : undefined;
}

export function deactivate() {}