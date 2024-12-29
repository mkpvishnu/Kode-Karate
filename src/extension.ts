import * as vscode from 'vscode';
import { KarateJarManager } from './jarManager';
import { JavaFinder } from './javaFinder';
import { WebViewProvider } from './webview/webviewManager';
import { KarateRunner } from './runners/karateRunner';
import { registerCommands } from './commands';
import { KarateCodeLensProvider, KarateCompletionProvider, KarateHoverProvider } from './providers';
import { FeatureTreeProvider, FeatureTreeItem } from './providers/featureTreeProvider';
import { KarateStatusBar } from './statusBar/karateStatus';

let outputChannel: vscode.OutputChannel;

function log(message: string) {
    console.log(message);
    outputChannel?.appendLine(message);
}

export async function activate(context: vscode.ExtensionContext) {
    // Create output channel first
    outputChannel = vscode.window.createOutputChannel('Kode Karate');
    log('Activating Kode Karate extension...');
    
    try {
        // Initialize Karate Runner
        const karateRunner = new KarateRunner(context, outputChannel);
        log('Karate Runner initialized');

        // Initialize Run History Provider
        let runHistoryProvider = new WebViewProvider(
            context.extensionUri,
            'karateRunHistory'
        );

        // Register WebView Provider for Run History
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                'karateRunHistory',
                runHistoryProvider
            )
        );

        // Set up Feature Tree View
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const featureTreeProvider = new FeatureTreeProvider(
                workspaceFolder.uri.fsPath,
                async (filePath: string, scenarioName?: string) => {
                    try {
                        await karateRunner.runKarate(filePath, scenarioName);
                    } catch (error) {
                        log(`Error running Karate test: ${error}`);
                        throw error;
                    }
                }
            );

            // Register Tree View
            const treeView = vscode.window.createTreeView('karateFeatureExplorer', {
                treeDataProvider: featureTreeProvider,
                showCollapseAll: true
            });

            // Register tree view refresh command
            context.subscriptions.push(
                vscode.commands.registerCommand('karateFeatureExplorer.refresh', () => 
                    featureTreeProvider.refresh()
                ),
                vscode.commands.registerCommand('karateFeatureExplorer.runFeature', (item: FeatureTreeItem) => {
                    if (item.featurePath) {
                        karateRunner.runKarate(item.featurePath);
                    }
                }),
                vscode.commands.registerCommand('karateFeatureExplorer.runScenario', (item: FeatureTreeItem) => {
                    if (item.featurePath && item.label) {
                        karateRunner.runKarate(item.featurePath, item.label);
                    }
                })
            );

            // Add tree view to subscriptions
            context.subscriptions.push(treeView);

            // Set providers in runner
            karateRunner.setViewProviders(null, runHistoryProvider);
        }

        try {
            // Add file watcher for .feature files
            const featureWatcher = vscode.workspace.createFileSystemWatcher('**/*.feature');
            featureWatcher.onDidCreate(() => {
                vscode.commands.executeCommand('karateFeatureExplorer.refresh');
            });
            featureWatcher.onDidDelete(() => {
                vscode.commands.executeCommand('karateFeatureExplorer.refresh');
            });
            featureWatcher.onDidChange(() => {
                vscode.commands.executeCommand('karateFeatureExplorer.refresh');
            });
            context.subscriptions.push(featureWatcher);
            log('Feature file watcher initialized');
        } catch (error) {
            log(`Error setting up file watcher: ${error}`);
        }

        try {
            // Register Commands
            await registerCommands(context, karateRunner);
            log('Commands registered');
        } catch (error) {
            log(`Error registering commands: ${error}`);
            throw error;
        }

        try {
            // Register Language Providers
            const codeLensProvider = new KarateCodeLensProvider();
            const completionProvider = new KarateCompletionProvider();
            const hoverProvider = new KarateHoverProvider();

            context.subscriptions.push(
                vscode.languages.registerCodeLensProvider('karate', codeLensProvider),
                vscode.languages.registerCompletionItemProvider('karate', completionProvider),
                vscode.languages.registerHoverProvider('karate', hoverProvider)
            );
            log('Language providers registered');
        } catch (error) {
            log(`Error registering language providers: ${error}`);
        }

        try {
            // Initialize Status Bar
            const statusBar = new KarateStatusBar();
            context.subscriptions.push(statusBar);
            log('Status bar initialized');
        } catch (error) {
            log(`Error initializing status bar: ${error}`);
        }

        try {
            // Find Java 11
            const java11Path = await JavaFinder.findJava11();
            log(`Found Java 11 at: ${java11Path}`);
        } catch (error) {
            log(`Warning: Java 11 not found - ${error}`);
            vscode.window.showWarningMessage('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
        }

        log('Kode Karate extension activated successfully');

    } catch (error) {
        const message = `Critical error activating Kode Karate: ${error}`;
        log(message);
        vscode.window.showErrorMessage(message);
        throw error;
    }
}

export function deactivate() {
    log('Deactivating Kode Karate extension...');
    outputChannel?.dispose();
}