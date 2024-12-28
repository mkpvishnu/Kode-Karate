import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BaseView, RunCallback } from './baseView';

export class FeatureExplorerView implements BaseView {
    private readonly _view: vscode.WebviewView;
    private _runCallback?: RunCallback;

    constructor(webview: vscode.WebviewView) {
        this._view = webview;
        
        // Handle messages from the WebView
        this._view.webview.onDidReceiveMessage(async message => {
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
        });
    }

    public setRunCallback(callback: RunCallback) {
        this._runCallback = callback;
    }

    public async render(): Promise<void> {
        const features = await this.findFeatureFiles();
        this._view.webview.html = this.getWebviewContent(features);
    }

    public async refresh(): Promise<void> {
        await this.render();
    }

    private async findFeatureFiles(): Promise<string[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.feature');
        const files = await vscode.workspace.findFiles(pattern);
        return files.map(file => file.fsPath);
    }

    private getWebviewContent(features: string[]): string {
        return `<!DOCTYPE html>
        <html>
        <head>
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
                            ${path.relative(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', file)}
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
            </script>
        </body>
        </html>`;
    }
}