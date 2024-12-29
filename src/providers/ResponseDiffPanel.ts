import * as vscode from 'vscode';

export class ResponseDiffPanel {
    public static currentPanel: ResponseDiffPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;

        this._panel.webview.html = this._getWebviewContent();

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'compare':
                        await this._compareDiff(message.text1, message.text2);
                        return;
                    case 'formatJson':
                        await this._formatJson(message.text, message.textAreaId);
                        return;
                    case 'close':
                        this._panel.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ResponseDiffPanel.currentPanel) {
            ResponseDiffPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'responseDiff',
            'Response Diff Tool',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        ResponseDiffPanel.currentPanel = new ResponseDiffPanel(panel, extensionPath);
    }

    private async _compareDiff(text1: string, text2: string) {
        try {
            // Parse both texts as JSON if possible
            const obj1 = JSON.parse(text1);
            const obj2 = JSON.parse(text2);

            // Compare objects and generate diff
            const diff = this._generateDiff(obj1, obj2);

            // Send results back to webview
            await this._panel.webview.postMessage({
                command: 'diffResult',
                diff: diff
            });
        } catch (error) {
            this._showError('Failed to compare responses. Please ensure both inputs are valid JSON.');
        }
    }

    private _generateDiff(obj1: any, obj2: any, path: string = ''): any[] {
        const differences: any[] = [];
        
        // Helper function to handle different types of values
        const compareValues = (val1: any, val2: any, currentPath: string) => {
            if (typeof val1 !== typeof val2) {
                return {
                    path: currentPath,
                    type: 'type_mismatch',
                    value1: `${typeof val1}: ${JSON.stringify(val1)}`,
                    value2: `${typeof val2}: ${JSON.stringify(val2)}`
                };
            }
            if (val1 !== val2) {
                return {
                    path: currentPath,
                    type: 'value_mismatch',
                    value1: val1,
                    value2: val2
                };
            }
            return null;
        };

        // Handle arrays
        if (Array.isArray(obj1) && Array.isArray(obj2)) {
            const maxLength = Math.max(obj1.length, obj2.length);
            for (let i = 0; i < maxLength; i++) {
                if (i >= obj1.length) {
                    differences.push({
                        path: `${path}[${i}]`,
                        type: 'missing_in_first',
                        value2: obj2[i]
                    });
                } else if (i >= obj2.length) {
                    differences.push({
                        path: `${path}[${i}]`,
                        type: 'missing_in_second',
                        value1: obj1[i]
                    });
                } else {
                    const nestedDiff = this._generateDiff(
                        obj1[i],
                        obj2[i],
                        `${path}[${i}]`
                    );
                    differences.push(...nestedDiff);
                }
            }
            return differences;
        }

        // Handle objects
        if (typeof obj1 === 'object' && obj1 !== null &&
            typeof obj2 === 'object' && obj2 !== null) {
            const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
            
            for (const key of allKeys) {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (!(key in obj1)) {
                    differences.push({
                        path: currentPath,
                        type: 'missing_in_first',
                        value2: obj2[key]
                    });
                } else if (!(key in obj2)) {
                    differences.push({
                        path: currentPath,
                        type: 'missing_in_second',
                        value1: obj1[key]
                    });
                } else {
                    const nestedDiff = this._generateDiff(obj1[key], obj2[key], currentPath);
                    differences.push(...nestedDiff);
                }
            }
            return differences;
        }

        // Handle primitive values
        const diff = compareValues(obj1, obj2, path);
        if (diff) {
            differences.push(diff);
        }

        return differences;
    }

    private async _formatJson(text: string, textAreaId: string) {
        try {
            const obj = JSON.parse(text);
            const formatted = JSON.stringify(obj, null, 2);
            await this._panel.webview.postMessage({
                command: 'formatResult',
                text: formatted,
                textAreaId: textAreaId
            });
        } catch (error) {
            this._showError('Invalid JSON format');
        }
    }

    private _showError(message: string) {
        this._panel.webview.postMessage({
            command: 'error',
            text: message
        });
    }

    private _getWebviewContent() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Response Diff Tool</title>
            <style>
                body {
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    box-sizing: border-box;
                }
                .container {
                    display: flex;
                    gap: 10px;
                    flex: 1;
                    margin-bottom: 10px;
                }
                .input-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                textarea {
                    width: 100%;
                    flex: 1;
                    font-family: monospace;
                    resize: none;
                }
                .button-container {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                button {
                    padding: 8px 16px;
                }
                .output {
                    border: 1px solid #ccc;
                    padding: 10px;
                    margin-top: 10px;
                    font-family: monospace;
                    white-space: pre-wrap;
                    flex: 1;
                    overflow: auto;
                }
                .diff-item {
                    margin-bottom: 10px;
                    padding: 5px;
                    border-left: 3px solid;
                }
                .type-mismatch { border-color: #ff4444; }
                .value-mismatch { border-color: #ffaa00; }
                .missing-first { border-color: #44ff44; }
                .missing-second { border-color: #4444ff; }
                .path { font-weight: bold; }
                .error { color: #ff4444; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="input-container">
                    <h3>First Response</h3>
                    <textarea id="input1" placeholder="Paste first JSON response here..."></textarea>
                    <button onclick="formatJson('input1')">Format JSON</button>
                </div>
                <div class="input-container">
                    <h3>Second Response</h3>
                    <textarea id="input2" placeholder="Paste second JSON response here..."></textarea>
                    <button onclick="formatJson('input2')">Format JSON</button>
                </div>
            </div>
            <div class="button-container">
                <button id="compareBtn">Compare</button>
                <button id="clearBtn">Clear</button>
                <button id="closeBtn">Close</button>
            </div>
            <div id="output" class="output"></div>
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('compareBtn').addEventListener('click', () => {
                    const input1 = document.getElementById('input1').value;
                    const input2 = document.getElementById('input2').value;
                    vscode.postMessage({
                        command: 'compare',
                        text1: input1,
                        text2: input2
                    });
                });

                document.getElementById('clearBtn').addEventListener('click', () => {
                    document.getElementById('input1').value = '';
                    document.getElementById('input2').value = '';
                    document.getElementById('output').innerHTML = '';
                });

                document.getElementById('closeBtn').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'close'
                    });
                });

                function formatJson(textAreaId) {
                    const text = document.getElementById(textAreaId).value;
                    vscode.postMessage({
                        command: 'formatJson',
                        text: text,
                        textAreaId: textAreaId
                    });
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'diffResult':
                            displayDiff(message.diff);
                            break;
                        case 'formatResult':
                            document.getElementById(message.textAreaId).value = message.text;
                            break;
                        case 'error':
                            document.getElementById('output').innerHTML = 
                                '<div class="error">Error: ' + message.text + '</div>';
                            break;
                    }
                });

                function displayDiff(diff) {
                    const output = document.getElementById('output');
                    if (diff.length === 0) {
                        output.innerHTML = '<div style="color: green">No differences found</div>';
                        return;
                    }

                    let html = '';
                    diff.forEach(item => {
                        let className = '';
                        let content = '';
                        
                        switch(item.type) {
                            case 'type_mismatch':
                                className = 'type-mismatch';
                                content = \`Type mismatch at <span class="path">\${item.path}</span>
                                          <br>First: \${item.value1}
                                          <br>Second: \${item.value2}\`;
                                break;
                            case 'value_mismatch':
                                className = 'value-mismatch';
                                content = \`Value mismatch at <span class="path">\${item.path}</span>
                                          <br>First: \${JSON.stringify(item.value1)}
                                          <br>Second: \${JSON.stringify(item.value2)}\`;
                                break;
                            case 'missing_in_first':
                                className = 'missing-first';
                                content = \`Missing in first response at <span class="path">\${item.path}</span>
                                          <br>Value: \${JSON.stringify(item.value2)}\`;
                                break;
                            case 'missing_in_second':
                                className = 'missing-second';
                                content = \`Missing in second response at <span class="path">\${item.path}</span>
                                          <br>Value: \${JSON.stringify(item.value1)}\`;
                                break;
                        }
                        
                        html += \`<div class="diff-item \${className}">\${content}</div>\`;
                    });
                    
                    output.innerHTML = html;
                }
            </script>
        </body>
        </html>`;
    }

    public dispose() {
        ResponseDiffPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}