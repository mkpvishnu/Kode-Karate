"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebViewProvider = void 0;
const featureExplorer_1 = require("./featureExplorer");
const runHistory_1 = require("./runHistory");
class WebViewProvider {
    constructor(_extensionUri, _viewType, _runCallback) {
        this._extensionUri = _extensionUri;
        this._viewType = _viewType;
        this._runCallback = _runCallback;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        // Set webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        // Initialize the appropriate view based on viewType
        if (this._viewType === 'karateFeatureExplorer') {
            const featureExplorer = new featureExplorer_1.FeatureExplorerView(webviewView);
            if (this._runCallback) {
                featureExplorer.setRunCallback(this._runCallback);
            }
            this.view = featureExplorer;
        }
        else if (this._viewType === 'karateRunHistory') {
            this.view = new runHistory_1.RunHistoryView(webviewView);
        }
        // Initial render
        this.view?.render();
    }
    async refresh() {
        await this.view?.refresh();
    }
}
exports.WebViewProvider = WebViewProvider;
//# sourceMappingURL=webviewManager.js.map