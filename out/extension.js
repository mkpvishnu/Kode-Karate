"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const javaFinder_1 = require("./javaFinder");
const webviewManager_1 = require("./webview/webviewManager");
const karateRunner_1 = require("./runners/karateRunner");
const commands_1 = require("./commands");
const providers_1 = require("./providers");
const karateStatus_1 = require("./statusBar/karateStatus");
async function activate(context) {
    console.log('Activating Karate Runner extension...');
    const outputChannel = vscode.window.createOutputChannel('Karate Runner');
    outputChannel.appendLine('Initializing Karate Runner...');
    try {
        // Initialize Karate Runner
        const karateRunner = new karateRunner_1.KarateRunner(context, outputChannel);
        outputChannel.appendLine('Karate Runner initialized');
        // Initialize WebView Providers
        const featureExplorerProvider = new webviewManager_1.WebViewProvider(context.extensionUri, 'karateFeatureExplorer', (filePath, scenarioName) => karateRunner.runKarate(filePath, scenarioName));
        const runHistoryProvider = new webviewManager_1.WebViewProvider(context.extensionUri, 'karateRunHistory');
        // Set providers in runner
        karateRunner.setViewProviders(featureExplorerProvider, runHistoryProvider);
        outputChannel.appendLine('WebView providers initialized');
        // Register WebView Providers
        context.subscriptions.push(vscode.window.registerWebviewViewProvider('karateFeatureExplorer', featureExplorerProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        }), vscode.window.registerWebviewViewProvider('karateRunHistory', runHistoryProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        }));
        outputChannel.appendLine('WebView providers registered');
        // Add file watcher for .feature files
        const featureWatcher = vscode.workspace.createFileSystemWatcher('**/*.feature');
        featureWatcher.onDidCreate(() => featureExplorerProvider.refresh());
        featureWatcher.onDidDelete(() => featureExplorerProvider.refresh());
        featureWatcher.onDidChange(() => featureExplorerProvider.refresh());
        context.subscriptions.push(featureWatcher);
        outputChannel.appendLine('Feature file watcher initialized');
        // Register Commands
        (0, commands_1.registerCommands)(context, karateRunner);
        outputChannel.appendLine('Commands registered');
        // Register Providers
        const codeLensProvider = new providers_1.KarateCodeLensProvider();
        const completionProvider = new providers_1.KarateCompletionProvider();
        const hoverProvider = new providers_1.KarateHoverProvider();
        context.subscriptions.push(vscode.languages.registerCodeLensProvider('karate', codeLensProvider), vscode.languages.registerCompletionItemProvider('karate', completionProvider), vscode.languages.registerHoverProvider('karate', hoverProvider));
        outputChannel.appendLine('Language providers registered');
        // Initialize Status Bar
        const statusBar = new karateStatus_1.KarateStatusBar();
        context.subscriptions.push(statusBar);
        outputChannel.appendLine('Status bar initialized');
        // Find Java 11
        try {
            const java11Path = await javaFinder_1.JavaFinder.findJava11();
            outputChannel.appendLine(`Found Java 11 at: ${java11Path}`);
        }
        catch (error) {
            const message = `Warning: ${error.message}`;
            outputChannel.appendLine(message);
            vscode.window.showWarningMessage('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
        }
        outputChannel.appendLine('Karate Runner extension activated successfully');
        console.log('Karate Runner extension activated successfully');
    }
    catch (error) {
        const message = `Error activating Karate Runner: ${error.message}`;
        outputChannel.appendLine(message);
        console.error(message);
        vscode.window.showErrorMessage(message);
        throw error; // Re-throw to show error in VS Code
    }
}
exports.activate = activate;
function deactivate() {
    console.log('Deactivating Karate Runner extension...');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map