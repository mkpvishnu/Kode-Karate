import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface TestRun {
    id: string;
    feature: string;
    scenario?: string;
    timestamp: string;
    result: 'passed' | 'failed';
    reportPath: string;
}

export class RunHistoryView {
    private readonly _view: vscode.WebviewView;
    private readonly _historyFile: string;

    constructor(webview: vscode.WebviewView) {
        this._view = webview;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this._historyFile = path.join(workspaceFolder?.uri.fsPath || '', '.karate-runner', 'history.json');
    }

    public async render() {
        const history = await this.loadHistory();
        this._view.webview.html = this.getHtml(history);
    }

    private async loadHistory(): Promise<TestRun[]> {
        try {
            if (fs.existsSync(this._historyFile)) {
                const content = await fs.promises.readFile(this._historyFile, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
        return [];
    }

    public async addRun(run: TestRun) {
        const history = await this.loadHistory();
        history.unshift(run); // Add new run at the beginning
        
        // Keep only the last 100 runs
        if (history.length > 100) {
            history.splice(100);
        }
        
        await this.saveHistory(history);
        await this.render();
    }

    private async saveHistory(history: TestRun[]) {
        try {
            const dir = path.dirname(this._historyFile);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            await fs.promises.writeFile(this._historyFile, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }

    public async deleteRun(id: string) {
        const history = await this.loadHistory();
        const filtered = history.filter(run => run.id !== id);
        await this.saveHistory(filtered);
        await this.render();
    }

    public async clearHistory() {
        await this.saveHistory([]);
        await this.render();
    }

    private getHtml(history: TestRun[]): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    padding: 10px;
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-editor-foreground);
                }
                .history-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .controls {
                    margin-bottom: 20px;
                }
                .run-item {
                    padding: 10px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    background: var(--vscode-list-hoverBackground);
                }
                .run-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 5px;
                }
                .feature-name {
                    font-weight: bold;
                }
                .passed { 
                    color: var(--vscode-testing-iconPassed);
                    font-weight: bold;
                }
                .failed { 
                    color: var(--vscode-testing-iconFailed);
                    font-weight: bold;
                }
                .timestamp {
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.9em;
                }
                .actions {
                    margin-top: 10px;
                    display: flex;
                    gap: 8px;
                }
                button {
                    padding: 4px 8px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .clear-all {
                    margin-bottom: 20px;
                }
                .no-history {
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                    padding: 20px;
                }
            </style>
        </head>
        <body>
            <div class="history-container">
                <div class="controls">
                    <button onclick="clearHistory()">Clear All History</button>
                </div>
                ${history.length === 0 ? `
                    <div class="no-history">No test runs recorded yet</div>
                ` : ''}
                ${history.map(run => `
                    <div class="run-item">
                        <div class="run-header">
                            <span class="feature-name">${run.feature}</span>
                            <span class="${run.result}">${run.result.toUpperCase()}</span>
                        </div>
                        ${run.scenario ? `<div>Scenario: ${run.scenario}</div>` : ''}
                        <div class="timestamp">${new Date(run.timestamp).toLocaleString()}</div>
                        <div class="actions">
                            <button onclick="openReport('${run.reportPath}')">View Report</button>
                            <button onclick="deleteRun('${run.id}')">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                function clearHistory() {
                    if (confirm('Are you sure you want to clear all test history?')) {
                        vscode.postMessage({ command: 'clearHistory' });
                    }
                }

                function deleteRun(id) {
                    vscode.postMessage({ command: 'deleteRun', id });
                }

                function openReport(path) {
                    vscode.postMessage({ command: 'openReport', path });
                }
            </script>
        </body>
        </html>`;
    }
}