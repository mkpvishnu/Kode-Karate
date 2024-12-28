import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface TestRun {
    id: string;
    feature: string;
    scenario?: string;
    timestamp: string;
    result: 'passed' | 'failed';
    reportPath: string;
    duration: number;
    scenariosPassed: number;
    scenariosFailed: number;
    isScenarioRun: boolean;
}

interface KarateSummary {
    resultDate: string;
    featureSummary: Array<{
        name: string;
        relativePath: string;
        durationMillis: number;
        passedCount: number;
        failedCount: number;
        failed: boolean;
    }>;
    scenariosPassed: number;
    scenariosfailed: number;
}

export class RunHistoryView {
    private readonly _view: vscode.WebviewView;
    private readonly _targetDir: string;

    private _watcher: vscode.FileSystemWatcher;

    constructor(webview: vscode.WebviewView) {
        this._view = webview;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        this._targetDir = path.join(workspaceFolder?.uri.fsPath || '', 'target');
        
        // Create file watcher for target directory to catch all report changes
        this._watcher = vscode.workspace.createFileSystemWatcher(
            path.join(this._targetDir, '**/*'),
            false,
            false,
            false
        );
        
        // Refresh view when reports are created or modified
        this._watcher.onDidCreate(() => this.refresh());
        this._watcher.onDidChange(() => this.refresh());
    }

    dispose() {
        this._watcher.dispose();
    }

    public async render() {
        const history = await this.loadHistory();
        this._view.webview.html = this.getHtml(history);
    }

    public async refresh() {
        await this.render();
    }

    private async loadHistory(): Promise<TestRun[]> {
        try {
            if (!fs.existsSync(this._targetDir)) {
                return [];
            }

            const history: TestRun[] = [];
            const reportDirs = fs.readdirSync(this._targetDir)
                .filter(dir => dir.startsWith('karate-reports'))
                .map(dir => path.join(this._targetDir, dir));

            for (const reportDir of reportDirs) {
                const summaryPath = path.join(reportDir, 'karate-summary-json.txt');
                if (!fs.existsSync(summaryPath)) {
                    continue;
                }

                const content = fs.readFileSync(summaryPath, 'utf8');
                const summary: KarateSummary = JSON.parse(content);

                // Get timestamp from directory name if it exists, otherwise use resultDate
                let timestamp = summary.resultDate;
                const timestampMatch = reportDir.match(/karate-reports_(\d+)/);
                if (timestampMatch) {
                    const unixTimestamp = parseInt(timestampMatch[1]);
                    timestamp = new Date(unixTimestamp).toISOString();
                }

                // Add an entry for each feature in the summary
                summary.featureSummary.forEach(feature => {
                    history.push({
                        id: uuidv4(),
                        feature: feature.relativePath,
                        timestamp: timestamp,
                        result: feature.failed ? 'failed' : 'passed',
                        reportPath: path.join(reportDir, 'karate-summary.html'),
                        duration: feature.durationMillis,
                        scenariosPassed: feature.passedCount,
                        scenariosFailed: feature.failedCount,
                        isScenarioRun: false
                    });
                });
            }

            // Sort by timestamp, most recent first
            return history.sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
        } catch (error) {
            console.error('Error loading history:', error);
            return [];
        }
    }

    public async addRun(run: TestRun) {
        await this.refresh();
    }

    public async clearHistory() {
        try {
            if (!fs.existsSync(this._targetDir)) {
                return;
            }

            const reportDirs = fs.readdirSync(this._targetDir)
                .filter(dir => dir.startsWith('karate-reports'))
                .map(dir => path.join(this._targetDir, dir));

            if (reportDirs.length === 0) {
                return;
            }

            // Remove each report directory
            for (const reportDir of reportDirs) {
                try {
                    fs.rmSync(reportDir, { recursive: true, force: true });
                } catch (error) {
                    console.error(`Error removing ${reportDir}:`, error);
                }
            }

            // Refresh the view
            await this.refresh();
        } catch (error) {
            console.error('Error clearing history:', error);
            vscode.window.showErrorMessage('Failed to clear history. Please try again.');
        }
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
                .stats {
                    margin: 5px 0;
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
                        <div class="stats">
                            Duration: ${(run.duration / 1000).toFixed(2)}s | 
                            Scenarios: ${run.scenariosPassed} passed, ${run.scenariosFailed} failed
                        </div>
                        <div class="timestamp">${new Date(run.timestamp).toLocaleString()}</div>
                        <div class="actions">
                            <button onclick="openReport('${run.reportPath}')">View Report</button>
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

                function openReport(path) {
                    vscode.postMessage({ command: 'openReport', path });
                }
            </script>
        </body>
        </html>`;
    }
}