import * as vscode from 'vscode';
import { FeatureExplorerView } from './featureExplorer';
import { RunHistoryView } from './runHistory';
import { BaseView, RunCallback } from './baseView';

export class WebViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    public view?: BaseView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewType: string,
        private readonly _runCallback?: RunCallback
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        // Set webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Initialize the appropriate view based on viewType
        if (this._viewType === 'karateFeatureExplorer') {
            const featureExplorer = new FeatureExplorerView(webviewView);
            if (this._runCallback) {
                featureExplorer.setRunCallback(this._runCallback);
            }
            this.view = featureExplorer;
        } else if (this._viewType === 'karateRunHistory') {
            this.view = new RunHistoryView(webviewView);
        }

        // Initial render
        this.view?.render();
    }

    public async refresh() {
        await this.view?.refresh();
    }
}