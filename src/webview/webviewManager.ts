import * as vscode from 'vscode';
import { FeatureExplorerView } from './featureExplorer';
import { RunHistoryView } from './runHistory';
import { ConfigurationView } from './configurationView';

export class WebViewProvider implements vscode.WebviewViewProvider {
    private _view?: FeatureExplorerView | RunHistoryView | ConfigurationView;
    
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewType: string,
        private readonly _runKarateCallback?: (filePath: string, scenarioName?: string) => Promise<void>
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        switch (this._viewType) {
            case 'karateFeatureExplorer':
                this._view = new FeatureExplorerView(webviewView);
                this.handleFeatureExplorerMessages(webviewView);
                break;
            case 'karateRunHistory':
                this._view = new RunHistoryView(webviewView);
                this.handleRunHistoryMessages(webviewView);
                break;
            case 'karateConfiguration':
                this._view = new ConfigurationView(webviewView);
                this.handleConfigurationMessages(webviewView);
                break;
        }

        // Only call render if _view exists
        if (this._view) {
            return this._view.render();
        }
    }

    private handleFeatureExplorerMessages(webviewView: vscode.WebviewView) {
        webviewView.webview.onDidReceiveMessage(async message => {
            if (!this._runKarateCallback) return;

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

    private handleRunHistoryMessages(webviewView: vscode.WebviewView) {
        webviewView.webview.onDidReceiveMessage(async message => {
            const historyView = this._view as RunHistoryView;
            if (!historyView) return;

            switch (message.command) {
                case 'deleteRun':
                    await historyView.deleteRun(message.id);
                    break;
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

    private handleConfigurationMessages(webviewView: vscode.WebviewView) {
        webviewView.webview.onDidReceiveMessage(async message => {
            const configView = this._view as ConfigurationView;
            if (!configView) return;

            switch (message.command) {
                case 'updateOutputMode':
                    await vscode.commands.executeCommand('karate-runner.configureLogging');
                    await configView.render();
                    break;
            }
        });
    }

    public get view(): FeatureExplorerView | RunHistoryView | ConfigurationView | undefined {
        return this._view;
    }

    public async refresh(): Promise<void> {
        if (this._view) {
            await this._view.render();
        }
    }
}