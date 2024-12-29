import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BaseView, RunCallback } from './baseView';

export class FeatureExplorerView implements BaseView {
    private readonly _view: vscode.WebviewView;
    private _runCallback?: RunCallback;
    private readonly _outputChannel: vscode.OutputChannel;

    constructor(webview: vscode.WebviewView) {
        this._view = webview;
        this._outputChannel = vscode.window.createOutputChannel('Kode Karate Feature Explorer');
        
        // Handle messages from the WebView
        this._view.webview.onDidReceiveMessage(async message => {
            try {
                switch (message.command) {
                    case 'runFeature':
                        if (this._runCallback) {
                            await this._runCallback(message.filePath, message.scenarioName);
                        }
                        break;
                    case 'refresh':
                        await this.refresh();
                        break;
                }
            } catch (error) {
                this._outputChannel.appendLine(`Error handling message: ${error}`);
                throw error;
            }
        });
    }

    public setRunCallback(callback: RunCallback) {
        this._runCallback = callback;
    }

    public async render(): Promise<void> {
        try {
            this._outputChannel.appendLine('Starting render');
            const features = await this.findFeatureFiles();
            this._outputChannel.appendLine(`Found ${features.length} feature files`);
            this._view.webview.html = this.getWebviewContent(features);
            this._outputChannel.appendLine('Render completed');
        } catch (error) {
            this._outputChannel.appendLine(`Error during render: ${error}`);
            throw error;
        }
    }

    public async refresh(): Promise<void> {
        try {
            this._outputChannel.appendLine('Starting refresh');
            await this.render();
            this._outputChannel.appendLine('Refresh completed');
        } catch (error) {
            this._outputChannel.appendLine(`Error during refresh: ${error}`);
            throw error;
        }
    }

    private async findFeatureFiles(): Promise<string[]> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                this._outputChannel.appendLine('No workspace folder found');
                return [];
            }

            const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.feature');
            const files = await vscode.workspace.findFiles(pattern);
            return files.map(file => file.fsPath);
        } catch (error) {
            this._outputChannel.appendLine(`Error finding feature files: ${error}`);
            throw error;
        }
    }

    private getWebviewContent(features: string[]): string {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            return `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        padding: 10px;
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-editor-foreground);
                    }
                    .feature-list {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .feature-item {
                        padding: 8px;
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    .feature-item:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    .button {
                        padding: 4px 8px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                    }
                    .button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="feature-list">
                    ${features.length === 0 ? '<div>No feature files found</div>' : ''}
                    ${features.map(file => `
                        <div class="feature-item">
                            <div>${path.basename(file)}</div>
                            <div style="font-size: 0.8em; color: var(--vscode-descriptionForeground);">
                                ${path.relative(workspaceFolder, file)}
                            </div>
                            <div style="margin-top: 8px;">
                                <button class="button" onclick="runFeature('${file.replace(/\\/g, '\\\\')}')">
                                    Run Test
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <script>
                    const vscode = acquireVsCodeApi();

                    function runFeature(filePath) {
                        vscode.postMessage({
                            command: 'runFeature',
                            filePath: filePath
                        });
                    }

                    // Send initial ready message
                    vscode.postMessage({
                        command: 'ready'
                    });
                </script>
            </body>
            </html>`;
        } catch (error) {
            this._outputChannel.appendLine(`Error generating webview content: ${error}`);
            throw error;
        }
    }

    dispose() {
        this._outputChannel.dispose();
    }
}