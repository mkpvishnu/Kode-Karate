import * as vscode from 'vscode';
import { KarateJarManager } from './jarManager';
import { JavaFinder } from './javaFinder';
import { WebViewProvider } from './webview/webviewManager';
import { KarateRunner } from './runners/karateRunner';
import { registerCommands } from './commands';
import { KarateCodeLensProvider, KarateCompletionProvider, KarateHoverProvider } from './providers';
import { KarateStatusBar } from './statusBar/karateStatus';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Activating Karate Runner extension...');
    
    const outputChannel = vscode.window.createOutputChannel('Karate Runner');
    outputChannel.appendLine('Initializing Karate Runner...');
    
    try {
        // Initialize Karate Runner
        const karateRunner = new KarateRunner(context, outputChannel);
        outputChannel.appendLine('Karate Runner initialized');

        // Initialize WebView Providers
        const featureExplorerProvider = new WebViewProvider(
            context.extensionUri,
            'karateFeatureExplorer',
            (filePath: string, scenarioName?: string) => karateRunner.runKarate(filePath, scenarioName)
        );
        
        const runHistoryProvider = new WebViewProvider(
            context.extensionUri,
            'karateRunHistory'
        );
        
        // Set providers in runner
        karateRunner.setViewProviders(featureExplorerProvider, runHistoryProvider);
        outputChannel.appendLine('WebView providers initialized');

        // Register WebView Providers
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                'karateFeatureExplorer',
                featureExplorerProvider,
                {
                    webviewOptions: { retainContextWhenHidden: true }
                }
            ),
            vscode.window.registerWebviewViewProvider(
                'karateRunHistory',
                runHistoryProvider,
                {
                    webviewOptions: { retainContextWhenHidden: true }
                }
            )
        );
        outputChannel.appendLine('WebView providers registered');

        // Add file watcher for .feature files
        const featureWatcher = vscode.workspace.createFileSystemWatcher('**/*.feature');
        featureWatcher.onDidCreate(() => featureExplorerProvider.refresh());
        featureWatcher.onDidDelete(() => featureExplorerProvider.refresh());
        featureWatcher.onDidChange(() => featureExplorerProvider.refresh());
        context.subscriptions.push(featureWatcher);
        outputChannel.appendLine('Feature file watcher initialized');

        // Register Commands
        registerCommands(context, karateRunner);
        outputChannel.appendLine('Commands registered');

        // Register Providers
        const codeLensProvider = new KarateCodeLensProvider();
        const completionProvider = new KarateCompletionProvider();
        const hoverProvider = new KarateHoverProvider();

        context.subscriptions.push(
            vscode.languages.registerCodeLensProvider('karate', codeLensProvider),
            vscode.languages.registerCompletionItemProvider('karate', completionProvider),
            vscode.languages.registerHoverProvider('karate', hoverProvider)
        );
        outputChannel.appendLine('Language providers registered');

        // Initialize Status Bar
        const statusBar = new KarateStatusBar();
        context.subscriptions.push(statusBar);
        outputChannel.appendLine('Status bar initialized');

        // Find Java 11
        try {
            const java11Path = await JavaFinder.findJava11();
            outputChannel.appendLine(`Found Java 11 at: ${java11Path}`);
        } catch (error: any) {
            const message = `Warning: ${error.message}`;
            outputChannel.appendLine(message);
            vscode.window.showWarningMessage('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
        }

        outputChannel.appendLine('Karate Runner extension activated successfully');
        console.log('Karate Runner extension activated successfully');

    } catch (error: any) {
        const message = `Error activating Karate Runner: ${error.message}`;
        outputChannel.appendLine(message);
        console.error(message);
        vscode.window.showErrorMessage(message);
        throw error; // Re-throw to show error in VS Code
    }
}

export function deactivate() {
    console.log('Deactivating Karate Runner extension...');
}