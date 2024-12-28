"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunHistoryView = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const uuid_1 = require("uuid");
class RunHistoryView {
    constructor(webview) {
        this._isRefreshing = false;
        this._view = webview;
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        this._workspaceFolder = workspaceFolder.uri.fsPath;
        this._targetDir = path.join(this._workspaceFolder, 'target');
        this.setupFileWatcher();
        // Handle webview messages
        this._view.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'clearHistory':
                    await this.clearHistory();
                    break;
                case 'openReport':
                    this.openReport(message.path);
                    break;
            }
        });
    }
    setupFileWatcher() {
        // Dispose of existing watcher if it exists
        if (this._watcher) {
            this._watcher.dispose();
        }
        // Create a new file system watcher for the target directory
        this._watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(this._workspaceFolder, 'target/karate-reports*/**/*'), false, // Don't ignore create events
        false, // Don't ignore change events
        false // Don't ignore delete events
        );
        // Set up event handlers
        this._watcher.onDidCreate(() => {
            console.log('File created in target directory');
            this.refreshWithDebounce();
        });
        this._watcher.onDidChange(() => {
            console.log('File changed in target directory');
            this.refreshWithDebounce();
        });
        this._watcher.onDidDelete(() => {
            console.log('File deleted in target directory');
            this.refreshWithDebounce();
        });
    }
    refreshWithDebounce() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        this.refreshTimeout = setTimeout(() => {
            this.refresh();
            this.refreshTimeout = undefined;
        }, 100); // Debounce for 100ms
    }
    dispose() {
        if (this._watcher) {
            this._watcher.dispose();
        }
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
    }
    async render() {
        const history = await this.loadHistory();
        if (this._view?.visible) {
            this._view.webview.html = this.getHtml(history);
        }
    }
    async refresh() {
        if (this._isRefreshing)
            return;
        this._isRefreshing = true;
        try {
            await this.render();
        }
        finally {
            this._isRefreshing = false;
        }
    }
    async clearHistory() {
        try {
            if (!fs.existsSync(this._targetDir)) {
                return;
            }
            const reportDirs = fs.readdirSync(this._targetDir)
                .filter(dir => dir.startsWith('karate-reports'))
                .map(dir => path.join(this._targetDir, dir));
            // Remove all report directories
            for (const dir of reportDirs) {
                try {
                    await this.removeDirectoryRecursively(dir);
                }
                catch (error) {
                    console.error(`Error removing directory ${dir}:`, error);
                }
            }
            // Force an immediate refresh
            await this.refresh();
            vscode.window.showInformationMessage('Test history cleared successfully');
        }
        catch (error) {
            console.error('Error clearing history:', error);
            vscode.window.showErrorMessage('Failed to clear history: ' + error.message);
        }
    }
    async removeDirectoryRecursively(dirPath) {
        return new Promise((resolve, reject) => {
            fs.rm(dirPath, { recursive: true, force: true }, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async loadHistory() {
        try {
            if (!fs.existsSync(this._targetDir)) {
                return [];
            }
            const history = [];
            const reportDirs = fs.readdirSync(this._targetDir)
                .filter(dir => dir.startsWith('karate-reports'))
                .map(dir => path.join(this._targetDir, dir))
                .filter(dir => fs.existsSync(dir));
            for (const reportDir of reportDirs) {
                const summaryPath = path.join(reportDir, 'karate-summary-json.txt');
                if (!fs.existsSync(summaryPath)) {
                    continue;
                }
                try {
                    const content = fs.readFileSync(summaryPath, 'utf8');
                    const summary = JSON.parse(content);
                    let timestamp = summary.resultDate;
                    const timestampMatch = reportDir.match(/karate-reports_(\d+)/);
                    if (timestampMatch) {
                        const unixTimestamp = parseInt(timestampMatch[1]);
                        timestamp = new Date(unixTimestamp).toISOString();
                    }
                    summary.featureSummary.forEach(feature => {
                        history.push({
                            id: (0, uuid_1.v4)(),
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
                catch (error) {
                    console.error(`Error processing summary file ${summaryPath}:`, error);
                }
            }
            return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
        catch (error) {
            console.error('Error loading history:', error);
            return [];
        }
    }
    openReport(reportPath) {
        vscode.env.openExternal(vscode.Uri.file(reportPath));
    }
    getHtml(history) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Karate Run History</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
                    padding: 1rem;
                }
                .history-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .history-table th, .history-table td {
                    padding: 0.5rem;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                .history-table th {
                    background-color: #f5f5f5;
                }
                .status {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .status.passed {
                    background-color: #e8f5e9;
                    color: #2e7d32;
                }
                .status.failed {
                    background-color: #ffebee;
                    color: #c62828;
                }
                .action-button {
                    background-color: #2196f3;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .action-button:hover {
                    background-color: #1976d2;
                }
            </style>
        </head>
        <body>
            <h1>Karate Run History</h1>
            ${history.length > 0 ? `
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Feature</th>
                            <th>Timestamp</th>
                            <th>Status</th>
                            <th>Duration</th>
                            <th>Scenarios</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(run => `
                            <tr>
                                <td>${run.feature}</td>
                                <td>${new Date(run.timestamp).toLocaleString()}</td>
                                <td>
                                    <span class="status ${run.result}">${run.result}</span>
                                </td>
                                <td>${run.duration ? `${(run.duration / 1000).toFixed(2)}s` : 'N/A'}</td>
                                <td>
                                    ${run.scenariosPassed || run.scenariosFailed ? `
                                        ✅ ${run.scenariosPassed || 0} / ❌ ${run.scenariosFailed || 0}
                                    ` : 'N/A'}
                                </td>
                                <td>
                                    <button class="action-button" onclick="openReport('${run.reportPath}')">
                                        View Report
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <p>No test runs found.</p>
            `}
            <button class="action-button" onclick="clearHistory()" style="margin-top: 1rem;">
                Clear History
            </button>
            <script>
                const vscode = acquireVsCodeApi();
                function openReport(path) {
                    vscode.postMessage({ command: 'openReport', path });
                }
                function clearHistory() {
                    vscode.postMessage({ command: 'clearHistory' });
                }
            </script>
        </body>
        </html>
        `;
    }
}
exports.RunHistoryView = RunHistoryView;
//# sourceMappingURL=runHistory.js.map