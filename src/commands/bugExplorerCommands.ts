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

        const config = vscode.workspace.getConfiguration();
        console.log('Loading configuration...');  // Debug log

        const apiEndpoint = config.get('karateRunner.bugTracker.apiEndpoint', '');
        const method = config.get('karateRunner.bugTracker.method', 'GET');
        const headers = config.get('karateRunner.bugTracker.headers', {});
        const payload = config.get('karateRunner.bugTracker.payload', '');
        const idPattern = config.get('karateRunner.bugTracker.idPattern', '@bug/{{id}}');
        const responseParser = config.get('karateRunner.bugTracker.responseParser', {
            statusPath: 'issues[0].status_id',
            titlePath: 'issues[0].title',
            linkPath: 'issues[0].key',
            statusMapping: {
                'Open': 'Open',
                'Dev In Progress': 'In Progress',
                'On Hold': 'Blocked',
                'Deferred': 'Deferred',
                'Invalid': 'Closed',
                'Duplicate': 'Closed'
            }
        });

        console.log('Loaded responseParser:', responseParser);  // Debug log

        panel.webview.html = `
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
                        <input type="text" id="apiEndpoint" value="${apiEndpoint}" 
                            placeholder="e.g., https://api.example.com/issues/{{id}}">
                    </div>
                    <div class="form-group">
                        <label for="method">HTTP Method:</label>
                        <select id="method">
                            <option value="GET" ${(method as string) === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="POST" ${(method as string) === 'POST' ? 'selected' : ''}>POST</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="headers">Headers (JSON):</label>
                        <textarea id="headers" rows="4" placeholder="{\n  \"Authorization\": \"Bearer token\"\n}">${JSON.stringify(headers, null, 2)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="payload">Payload Template (for POST):</label>
                        <textarea id="payload" rows="4" placeholder="{\n  \"issueId\": \"{{id}}\"\n}">${payload}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="idPattern">Bug ID Pattern:</label>
                        <input type="text" id="idPattern" value="${idPattern}" 
                            placeholder="e.g., @bug/{{id}}">
                    </div>
                    <div class="form-group">
                        <label for="statusPath">Status JSON Path:</label>
                        <input type="text" id="statusPath" value="${responseParser.statusPath}" 
                            placeholder="e.g., data.status or status">
                    </div>
                    <div class="form-group">
                        <label for="titlePath">Title JSON Path:</label>
                        <input type="text" id="titlePath" value="${responseParser.titlePath}" 
                            placeholder="e.g., data.title or title">
                    </div>
                    <div class="form-group">
                        <label for="linkPath">Link JSON Path:</label>
                        <input type="text" id="linkPath" value="${responseParser.linkPath}" 
                            placeholder="e.g., data.url or url">
                    </div>
                    <div class="form-group">
                        <label for="statusMapping">Status Mapping (JSON):</label>
                        <textarea id="statusMapping" rows="4" placeholder="{\n  \"IN_PROGRESS\": \"In Progress\",\n  \"DONE\": \"Closed\",\n  \"TODO\": \"Open\"\n}">${JSON.stringify(responseParser.statusMapping, null, 2)}</textarea>
                    </div>
                    <button type="button" onclick="testConnection()">Test Connection</button>
                    <button type="button" onclick="saveConfig()">Save Configuration</button>
                </form>
                <script>
                    const vscode = acquireVsCodeApi();

                    function getConfig() {
                        try {
                            const statusMapping = JSON.parse(document.getElementById('statusMapping').value || '{}');
                            console.log('Parsed statusMapping:', statusMapping);  // Debug log

                            return {
                                apiEndpoint: document.getElementById('apiEndpoint').value,
                                method: document.getElementById('method').value,
                                headers: JSON.parse(document.getElementById('headers').value || '{}'),
                                payload: document.getElementById('payload').value,
                                idPattern: document.getElementById('idPattern').value,
                                responseParser: {
                                    statusPath: document.getElementById('statusPath').value,
                                    titlePath: document.getElementById('titlePath').value,
                                    linkPath: document.getElementById('linkPath').value,
                                    statusMapping: statusMapping
                                }
                            };
                        } catch (error) {
                            console.error('Error in getConfig:', error);  // Debug log
                            throw error;
                        }
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
                                message: 'Invalid JSON in headers or status mapping'
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
                    case 'error':
                        vscode.window.showErrorMessage(message.message);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private async updateConfiguration(config: any): Promise<void> {
        const configuration = vscode.workspace.getConfiguration();
        console.log('Saving responseParser:', config.responseParser);  // Debug log

        // Update each setting individually
        await configuration.update('karateRunner.bugTracker.apiEndpoint', config.apiEndpoint, vscode.ConfigurationTarget.Workspace);
        await configuration.update('karateRunner.bugTracker.method', config.method, vscode.ConfigurationTarget.Workspace);
        await configuration.update('karateRunner.bugTracker.headers', config.headers, vscode.ConfigurationTarget.Workspace);
        await configuration.update('karateRunner.bugTracker.payload', config.payload, vscode.ConfigurationTarget.Workspace);
        await configuration.update('karateRunner.bugTracker.idPattern', config.idPattern, vscode.ConfigurationTarget.Workspace);
        
        // Save response parser configuration
        const responseParser = {
            statusPath: config.responseParser.statusPath,
            titlePath: config.responseParser.titlePath,
            linkPath: config.responseParser.linkPath,
            statusMapping: config.responseParser.statusMapping
        };
        await configuration.update('karateRunner.bugTracker.responseParser', responseParser, vscode.ConfigurationTarget.Workspace);
        
        // Verify saved configuration
        const savedConfig = vscode.workspace.getConfiguration('karateRunner.bugTracker');
        console.log('Saved configuration:', savedConfig.get('responseParser'));  // Debug log
    }

    private async testConnection(config: any): Promise<void> {
        try {
            // Use a test bug ID
            const testId = 'TEST-123';
            const statusService = BugStatusService.getInstance();
            await statusService.getBugStatus(testId, {
                apiEndpoint: config.apiEndpoint,
                method: config.method as 'GET' | 'POST',
                headers: config.headers,
                payload: config.payload,
                idPattern: config.idPattern,
                responseParser: config.responseParser
            });
            vscode.window.showInformationMessage('Connection test successful!');
        } catch (error) {
            vscode.window.showErrorMessage(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}