import * as vscode from 'vscode';
import { ConfigurationView } from './configurationView';

export class WebViewProvider implements vscode.WebviewViewProvider {
    private _view?: ConfigurationView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewType: string
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        if (this._viewType === 'karateConfiguration') {
            this._view = new ConfigurationView(webviewView);
            this._view.render();
        }
    }

    public refresh() {
        if (this._view) {
            this._view.render();
        }
    }
}