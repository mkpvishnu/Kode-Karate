import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

export class CurlConverterPanel {
    public static currentPanel: CurlConverterPanel | undefined;
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
                    case 'convert':
                        await this._convertToCurl(message.text);
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

        if (CurlConverterPanel.currentPanel) {
            CurlConverterPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'curlConverter',
            'Convert to cURL',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        CurlConverterPanel.currentPanel = new CurlConverterPanel(panel, extensionPath);
    }

    private async _convertToCurl(karateLog: string) {
        try {
            const pythonExecutable: string = process.platform !== 'win32' ? 'python3' : 'python';
            const scriptPath = path.join(this._extensionPath, 'python', 'karate_to_curl.py');

            const pythonProcess = cp.spawn(pythonExecutable, [scriptPath]);
            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', async (code: number) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        if (result.status === 'success') {
                            await this._panel.webview.postMessage({
                                command: 'result',
                                text: result.curl
                            });
                        } else {
                            throw new Error(result.message);
                        }
                    } catch (e) {
                        this._showError('Failed to parse Python script output');
                    }
                } else {
                    this._showError(`Python script failed: ${stderr}`);
                }
            });

            // Write input to stdin
            pythonProcess.stdin.write(karateLog);
            pythonProcess.stdin.end();

        } catch (error) {
            this._showError('Failed to convert to cURL');
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
            <title>Convert to cURL</title>
            <style>
                body {
                    padding: 24px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #1e1e1e;
                    color: #e1e1e1;
                }
                h3 {
                    color: #569cd6;
                    margin-bottom: 16px;
                    font-weight: 600;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                textarea {
                    width: 100%;
                    min-height: 200px;
                    margin: 12px 0;
                    padding: 12px;
                    border: 1px solid #3c3c3c;
                    border-radius: 6px;
                    font-family: monospace;
                    font-size: 14px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    background-color: #252526;
                    color: #e1e1e1;
                }
                textarea:focus {
                    border-color: #569cd6;
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(86, 156, 214, 0.1);
                }
                .button-container {
                    margin: 16px 0;
                    display: flex;
                    gap: 12px;
                }
                button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    background-color: #0e639c;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s, transform 0.1s;
                }
                button:hover {
                    background-color: #1177bb;
                }
                button:active {
                    transform: scale(0.98);
                }
                #output {
                    margin-top: 20px;
                    padding: 16px;
                    background-color: #252526;
                    border-radius: 6px;
                    border: 1px solid #3c3c3c;
                    font-family: monospace;
                    white-space: pre-wrap;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    color: #e1e1e1;
                }
            </style>
        </head>
        <body>
            <textarea id="input" placeholder="Paste your Karate request log here...&#10;Example:&#10;1 > POST http://example.com&#10;1 > Accept: application/json"></textarea>
            <div>
                <button id="convertBtn">Convert to cURL</button>
                <button id="closeBtn">Close</button>
            </div>
            <div id="output" style="margin-top: 20px; white-space: pre-wrap; font-family: monospace;"></div>
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('convertBtn').addEventListener('click', () => {
                    const input = document.getElementById('input').value;
                    vscode.postMessage({
                        command: 'convert',
                        text: input
                    });
                });

                document.getElementById('closeBtn').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'close'
                    });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'result':
                            document.getElementById('output').textContent = message.text;
                            break;
                        case 'error':
                            document.getElementById('output').textContent = 'Error: ' + message.text;
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
    }

    public dispose() {
        CurlConverterPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}