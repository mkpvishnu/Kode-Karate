import * as vscode from 'vscode';
import { BugItem } from '../views/bugExplorer/bugItem';
import { BugExplorerProvider } from '../views/bugExplorer/bugExplorerProvider';
import { BugStatusService } from '../services/bugStatusService';

export class BugExplorerCommands {
    constructor(
        private bugExplorerProvider: BugExplorerProvider,
        private context: vscode.ExtensionContext
    ) {
        this.registerCommands();
    }

    private registerCommands(): void {
        // Refresh command
        this.context.subscriptions.push(
            vscode.commands.registerCommand('karateBugExplorer.refresh', () => {
                this.bugExplorerProvider.refresh();
            })
        );

        // Run scenario command
        this.context.subscriptions.push(
            vscode.commands.registerCommand('karateBugExplorer.runScenario', (item: BugItem) => {
                vscode.commands.executeCommand('karateFeatureExplorer.runScenario', {
                    fsPath: item.bugInfo.filePath,
                    lineNumber: item.bugInfo.lineNumber
                });
            })
        );

        // Configure command
        this.context.subscriptions.push(
            vscode.commands.registerCommand('karateBugExplorer.configure', () => {
                this.showConfigurationPanel();
            })
        );

        // Open bug link command
        this.context.subscriptions.push(
            vscode.commands.registerCommand('karateBugExplorer.openBugLink', (item: BugItem) => {
                if (item.bugInfo.status?.link) {
                    vscode.env.openExternal(vscode.Uri.parse(item.bugInfo.status.link));
                }
            })
        );
    }

    private async showConfigurationPanel(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'bugTrackerConfig',
            'Bug Tracker Configuration',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        const config = vscode.workspace.getConfiguration('karateRunner.bugTracker');

        panel.webview.html = this.getConfigurationHtml(config);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'saveConfig':
                        await this.updateConfiguration(message.config);
                        vscode.window.showInformationMessage('Bug tracker configuration saved');
                        this.bugExplorerProvider.refresh();
                        panel.dispose();
                        break;
                    case 'testConnection':
                        await this.testConnection(message.config);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private getConfigurationHtml(config: vscode.WorkspaceConfiguration): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Bug Tracker Configuration</title>
                <style>
                    body {
                        padding: 20px;
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                    }
                    .form-group {
                        margin-bottom: 15px;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                    }
                    input, select, textarea {
                        width: 100%;
                        padding: 5px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                    }
                    button {
                        padding: 8px 16px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        cursor: pointer;
                        margin-right: 10px;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <form id="configForm">
                    <div class="form-group">
                        <label for="apiEndpoint">API Endpoint:</label>
                        <input type="text" id="apiEndpoint" value="${config.get('apiEndpoint', '')}" 
                            placeholder="e.g., https://api.example.com/issues/{{id}}">
                    </div>
                    <div class="form-group">
                        <label for="method">HTTP Method:</label>
                        <select id="method">
                            <option value="GET" ${config.get('method', 'GET') === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="POST" ${config.get('method') === 'POST' ? 'selected' : ''}>POST</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="headers">Headers (JSON):</label>
                        <textarea id="headers" rows="4" placeholder="{\n  \"Authorization\": \"Bearer token\"\n}">${JSON.stringify(config.get('headers', {}), null, 2)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="payload">Payload Template (for POST):</label>
                        <textarea id="payload" rows="4" placeholder="{\n  \"issueId\": \"{{id}}\"\n}">${config.get('payload', '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="idPattern">Bug ID Pattern:</label>
                        <input type="text" id="idPattern" value="${config.get('idPattern', '@bug/{{id}}')}" 
                            placeholder="e.g., @bug/{{id}}">
                    </div>
                    <button type="button" onclick="testConnection()">Test Connection</button>
                    <button type="button" onclick="saveConfig()">Save Configuration</button>
                </form>
                <script>
                    const vscode = acquireVsCodeApi();

                    function getConfig() {
                        return {
                            apiEndpoint: document.getElementById('apiEndpoint').value,
                            method: document.getElementById('method').value,
                            headers: JSON.parse(document.getElementById('headers').value || '{}'),
                            payload: document.getElementById('payload').value,
                            idPattern: document.getElementById('idPattern').value
                        };
                    }

                    function saveConfig() {
                        try {
                            const config = getConfig();
                            vscode.postMessage({
                                command: 'saveConfig',
                                config: config
                            });
                        } catch (error) {
                            vscode.postMessage({
                                command: 'error',
                                message: 'Invalid JSON in headers'
                            });
                        }
                    }

                    function testConnection() {
                        try {
                            const config = getConfig();
                            vscode.postMessage({
                                command: 'testConnection',
                                config: config
                            });
                        } catch (error) {
                            vscode.postMessage({
                                command: 'error',
                                message: 'Invalid configuration'
                            });
                        }
                    }
                </script>
            </body>
            </html>
        `;
    }

    private async updateConfiguration(config: any): Promise<void> {
        const configuration = vscode.workspace.getConfiguration('karateRunner');
        await configuration.update('bugTracker', {
            apiEndpoint: config.apiEndpoint,
            method: config.method,
            headers: config.headers,
            payload: config.payload,
            idPattern: config.idPattern
        }, vscode.ConfigurationTarget.Workspace);
    }

    private async testConnection(config: any): Promise<void> {
        try {
            // Use a test bug ID
            const testId = 'TEST-123';
            const statusService = BugStatusService.getInstance();
            await statusService.getBugStatus(testId, config);
            vscode.window.showInformationMessage('Connection test successful!');
        } catch (error) {
            vscode.window.showErrorMessage(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
