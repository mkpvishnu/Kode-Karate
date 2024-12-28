"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebViewProvider = void 0;
const vscode = require("vscode");
const featureExplorer_1 = require("./featureExplorer");
const runHistory_1 = require("./runHistory");
class WebViewProvider {
    constructor(_extensionUri, _viewType, _runKarateCallback) {
        this._extensionUri = _extensionUri;
        this._viewType = _viewType;
        this._runKarateCallback = _runKarateCallback;
    }
    resolveWebviewView(webviewView, context, _token) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        switch (this._viewType) {
            case 'karateFeatureExplorer':
                this._view = new featureExplorer_1.FeatureExplorerView(webviewView);
                this.handleFeatureExplorerMessages(webviewView);
                break;
            case 'karateRunHistory':
                this._view = new runHistory_1.RunHistoryView(webviewView);
                this.handleRunHistoryMessages(webviewView);
                break;
        }
        // Only call render if _view exists
        if (this._view) {
            return this._view.render();
        }
    }
    handleFeatureExplorerMessages(webviewView) {
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (!this._runKarateCallback)
                return;
            switch (message.command) {
                case 'runFeature':
                    await this._runKarateCallback(message.feature);
                    break;
                case 'runScenario':
                    await this._runKarateCallback(message.feature, message.scenario);
                    break;
            }
        });
    }
    handleRunHistoryMessages(webviewView) {
        webviewView.webview.onDidReceiveMessage(async (message) => {
            const historyView = this._view;
            if (!historyView)
                return;
            switch (message.command) {
                case 'clearHistory':
                    await historyView.clearHistory();
                    break;
                case 'openReport':
                    const uri = vscode.Uri.file(message.path);
                    await vscode.env.openExternal(uri);
                    break;
            }
        });
    }
    get view() {
        return this._view;
    }
    async refresh() {
        if (this._view) {
            await this._view.render();
        }
    }
}
exports.WebViewProvider = WebViewProvider;
//# sourceMappingURL=webviewManager.js.map