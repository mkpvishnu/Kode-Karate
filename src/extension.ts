import * as vscode from 'vscode';
import { KarateJarManager } from './jarManager';
import { JavaFinder } from './javaFinder';
import { WebViewProvider } from './webview/webviewManager';
import { KarateRunner } from './runners/karateRunner';
import { registerCommands } from './commands';
import { KarateCodeLensProvider, KarateCompletionProvider, KarateHoverProvider } from './providers';
import { KarateStatusBar } from './statusBar/karateStatus';

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Karate Runner');
    const jarManager = new KarateJarManager(context, outputChannel);

    // Initialize Karate Runner first
    const karateRunner = new KarateRunner(context, outputChannel);

    // Initialize WebView Providers with runner
    const featureExplorerProvider = new WebViewProvider(
        context.extensionUri,
        'karateFeatureExplorer',
        (filePath: string, scenarioName?: string) => karateRunner.runKarate(filePath, scenarioName)
    );
    const runHistoryProvider = new WebViewProvider(
        context.extensionUri,
        'karateRunHistory'
    );
    const configurationProvider = new WebViewProvider(
        context.extensionUri,
        'karateConfiguration'
    );

    // Set providers in runner
    karateRunner.setViewProviders(featureExplorerProvider, runHistoryProvider);

    // Register WebView Providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('karateFeatureExplorer', featureExplorerProvider),
        vscode.window.registerWebviewViewProvider('karateRunHistory', runHistoryProvider),
        vscode.window.registerWebviewViewProvider('karateConfiguration', configurationProvider)
    );

    // Add file watcher for .feature files
    const featureWatcher = vscode.workspace.createFileSystemWatcher('**/*.feature');
    
    // Refresh feature explorer on file changes
    featureWatcher.onDidCreate(() => featureExplorerProvider.refresh());
    featureWatcher.onDidDelete(() => featureExplorerProvider.refresh());
    featureWatcher.onDidChange(() => featureExplorerProvider.refresh());
    
    // Add watcher to disposables
    context.subscriptions.push(featureWatcher);

    // Register Commands
    registerCommands(context, karateRunner);

    // Register Providers
    const codeLensProvider = new KarateCodeLensProvider();
    const completionProvider = new KarateCompletionProvider();
    const hoverProvider = new KarateHoverProvider();

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('karate', codeLensProvider),
        vscode.languages.registerCompletionItemProvider('karate', completionProvider),
        vscode.languages.registerHoverProvider('karate', hoverProvider)
    );

    // Initialize Status Bar
    const statusBar = new KarateStatusBar();
    context.subscriptions.push(statusBar);

    // Find Java 11 at startup
    try {
        const java11Path = await JavaFinder.findJava11();
        outputChannel.appendLine(`Found Java 11 at: ${java11Path}`);
    } catch (error: any) {
        outputChannel.appendLine(`Warning: ${error.message}`);
        vscode.window.showWarningMessage('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
    }
}

export function deactivate() {}