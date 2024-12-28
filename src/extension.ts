import * as vscode from 'vscode';
import { KarateJarManager } from './jarManager';
import { JavaFinder } from './javaFinder';
import { WebViewProvider } from './webview/webviewManager';
import { KarateRunner } from './runners/karateRunner';
import { registerCommands } from './commands';
import { KarateCodeLensProvider, KarateCompletionProvider, KarateHoverProvider } from './providers';
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

        // Initialize WebView Providers
        let featureExplorerProvider: WebViewProvider;
        let runHistoryProvider: WebViewProvider;

        try {
            featureExplorerProvider = new WebViewProvider(
                context.extensionUri,
                'karateFeatureExplorer',
                async (filePath: string, scenarioName?: string) => {
                    try {
                        await karateRunner.runKarate(filePath, scenarioName);
                    } catch (error) {
                        log(`Error running Karate test: ${error}`);
                        throw error;
                    }
                }
            );
            
            runHistoryProvider = new WebViewProvider(
                context.extensionUri,
                'karateRunHistory'
            );
            
            // Set providers in runner
            karateRunner.setViewProviders(featureExplorerProvider, runHistoryProvider);
            log('WebView providers initialized');
        } catch (error) {
            log(`Error initializing WebView providers: ${error}`);
            throw error;
        }

        try {
            // Register WebView Providers with deferred registration
            let webviewRegistrations = [
                vscode.window.registerWebviewViewProvider(
                    'karateFeatureExplorer',
                    featureExplorerProvider
                ),
                vscode.window.registerWebviewViewProvider(
                    'karateRunHistory',
                    runHistoryProvider
                )
            ];

            // Add registrations to subscriptions
            context.subscriptions.push(...webviewRegistrations);
            log('WebView providers registered');

            // Initial refresh after a short delay
            setTimeout(() => {
                log('Performing initial view refresh...');
                featureExplorerProvider.refresh();
                runHistoryProvider.refresh();
            }, 1000);

        } catch (error) {
            log(`Error registering WebView providers: ${error}`);
            throw error;
        }

        try {
            // Add file watcher for .feature files
            const featureWatcher = vscode.workspace.createFileSystemWatcher('**/*.feature');
            featureWatcher.onDidCreate(() => {
                log('Feature file created, refreshing views...');
                featureExplorerProvider.refresh();
            });
            featureWatcher.onDidDelete(() => {
                log('Feature file deleted, refreshing views...');
                featureExplorerProvider.refresh();
            });
            featureWatcher.onDidChange(() => {
                log('Feature file changed, refreshing views...');
                featureExplorerProvider.refresh();
            });
            context.subscriptions.push(featureWatcher);
            log('Feature file watcher initialized');
        } catch (error) {
            log(`Error setting up file watcher: ${error}`);
            // Non-critical error, don't throw
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
            // Non-critical error, don't throw
        }

        try {
            // Initialize Status Bar
            const statusBar = new KarateStatusBar();
            context.subscriptions.push(statusBar);
            log('Status bar initialized');
        } catch (error) {
            log(`Error initializing status bar: ${error}`);
            // Non-critical error, don't throw
        }

        try {
            // Find Java 11
            const java11Path = await JavaFinder.findJava11();
            log(`Found Java 11 at: ${java11Path}`);
        } catch (error) {
            log(`Warning: Java 11 not found - ${error}`);
            vscode.window.showWarningMessage('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
            // Non-critical error, don't throw
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