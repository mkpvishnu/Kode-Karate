import * as vscode from 'vscode';
import { FeatureExplorerView } from './featureExplorer';
import { RunHistoryView } from './runHistory';
import { BaseView, RunCallback } from './baseView';

export class WebViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    public view?: BaseView;
    private readonly _outputChannel: vscode.OutputChannel;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewType: string,
        private readonly _runCallback?: RunCallback
    ) {
        this._outputChannel = vscode.window.createOutputChannel('Kode Karate WebView');
        this._outputChannel.appendLine(`WebViewProvider created for ${_viewType}`);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        try {
            this._outputChannel.appendLine(`Resolving webview for ${this._viewType}`);
            this._view = webviewView;

            // Set webview options
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [this._extensionUri]
            };

            // Initialize the appropriate view based on viewType
            if (this._viewType === 'karateFeatureExplorer') {
                this._outputChannel.appendLine('Creating FeatureExplorerView');
                const featureExplorer = new FeatureExplorerView(webviewView);
                if (this._runCallback) {
                    featureExplorer.setRunCallback(this._runCallback);
                }
                this.view = featureExplorer;
            } else if (this._viewType === 'karateRunHistory') {
                this._outputChannel.appendLine('Creating RunHistoryView');
                this.view = new RunHistoryView(webviewView);
            }

            // Initial render
            this._outputChannel.appendLine(`Initiating initial render for ${this._viewType}`);
            this.view?.render().catch(error => {
                this._outputChannel.appendLine(`Error during initial render: ${error}`);
                throw error;
            });

            this._outputChannel.appendLine(`WebView resolved successfully for ${this._viewType}`);
        } catch (error) {
            this._outputChannel.appendLine(`Error resolving webview: ${error}`);
            throw error;
        }
    }

    public async refresh() {
        try {
            this._outputChannel.appendLine(`Refreshing ${this._viewType}`);
            await this.view?.refresh();
            this._outputChannel.appendLine(`Refresh completed for ${this._viewType}`);
        } catch (error) {
            this._outputChannel.appendLine(`Error during refresh: ${error}`);
            throw error;
        }
    }

    dispose() {
        this._outputChannel.dispose();
    }
}