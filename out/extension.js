"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const jarManager_1 = require("./jarManager");
const javaFinder_1 = require("./javaFinder");
const webviewManager_1 = require("./webview/webviewManager");
const karateRunner_1 = require("./runners/karateRunner");
const commands_1 = require("./commands");
const providers_1 = require("./providers");
const karateStatus_1 = require("./statusBar/karateStatus");
async function activate(context) {
    const outputChannel = vscode.window.createOutputChannel('Karate Runner');
    const jarManager = new jarManager_1.KarateJarManager(context, outputChannel);
    // Initialize Karate Runner first
    const karateRunner = new karateRunner_1.KarateRunner(context, outputChannel);
    // Initialize WebView Providers with runner
    const featureExplorerProvider = new webviewManager_1.WebViewProvider(context.extensionUri, 'karateFeatureExplorer', (filePath, scenarioName) => karateRunner.runKarate(filePath, scenarioName));
    const runHistoryProvider = new webviewManager_1.WebViewProvider(context.extensionUri, 'karateRunHistory');
    const configurationProvider = new webviewManager_1.WebViewProvider(context.extensionUri, 'karateConfiguration');
    // Set providers in runner
    karateRunner.setViewProviders(featureExplorerProvider, runHistoryProvider);
    // Register WebView Providers
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('karateFeatureExplorer', featureExplorerProvider), vscode.window.registerWebviewViewProvider('karateRunHistory', runHistoryProvider), vscode.window.registerWebviewViewProvider('karateConfiguration', configurationProvider));
    // Register Commands
    (0, commands_1.registerCommands)(context, karateRunner);
    // Register Providers
    const codeLensProvider = new providers_1.KarateCodeLensProvider();
    const completionProvider = new providers_1.KarateCompletionProvider();
    const hoverProvider = new providers_1.KarateHoverProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider('karate', codeLensProvider), vscode.languages.registerCompletionItemProvider('karate', completionProvider), vscode.languages.registerHoverProvider('karate', hoverProvider));
    // Initialize Status Bar
    const statusBar = new karateStatus_1.KarateStatusBar();
    context.subscriptions.push(statusBar);
    // Find Java 11 at startup
    try {
        const java11Path = await javaFinder_1.JavaFinder.findJava11();
        outputChannel.appendLine(`Found Java 11 at: ${java11Path}`);
    }
    catch (error) {
        outputChannel.appendLine(`Warning: ${error.message}`);
        vscode.window.showWarningMessage('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
    }
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map