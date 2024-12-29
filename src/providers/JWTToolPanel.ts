import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';

export class JWTToolPanel {
    public static currentPanel: JWTToolPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this._panel = panel;
        this._extensionPath = extensionPath;
        this._panel.webview.html = this._getWebviewContent();
        this._setWebviewMessageListener();
    }

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

        if (JWTToolPanel.currentPanel) {
            JWTToolPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'jwtTool',
            'JWT Tool',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        JWTToolPanel.currentPanel = new JWTToolPanel(panel, extensionPath);
    }

    private _setWebviewMessageListener() {
        this._panel.webview.onDidReceiveMessage(
            async (message: any) => {
                const { command, ...params } = message;
                switch (command) {
                    case 'decode':
                        await this._handlePythonOperation('decode', params);
                        return;
                    case 'encode':
                        await this._handlePythonOperation('encode', params);
                        return;
                    case 'formatJson':
                        await this._formatJson(params.text, params.section);
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

    private async _handlePythonOperation(operation: string, params: any) {
        try {
            const pythonPath = process.platform !== 'win32' ? 'python3' : 'python';
            const scriptPath = path.join(this._extensionPath, 'python', 'jwt_tool.py');

            const result = await this._executePythonScript(pythonPath, scriptPath, operation, params);
            if (result.status === 'success') {
                await this._panel.webview.postMessage({
                    command: operation === 'decode' ? 'decodedJWT' : 'encodedJWT',
                    ...result
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this._showError(`Failed to ${operation} JWT: ${this._getErrorMessage(error)}`);
        }
    }

    private async _executePythonScript(pythonPath: string, scriptPath: string, operation: string, params: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const process = cp.spawn(pythonPath, [scriptPath]);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data: Buffer) => stdout += data.toString());
            process.stderr.on('data', (data: Buffer) => stderr += data.toString());

            process.on('error', reject);
            process.on('close', (code: number) => {
                if (code === 0) {
                    try {
                        resolve(JSON.parse(stdout));
                    } catch {
                        reject(new Error('Failed to parse Python output'));
                    }
                } else {
                    reject(new Error(stderr || 'Python script failed'));
                }
            });

            // Write operation and data
            process.stdin.write(operation + '\n');
            process.stdin.write(JSON.stringify(params) + '\n');
            process.stdin.end();
        });
    }

    private async _formatJson(text: string, section: string) {
        try {
            const formatted = JSON.stringify(JSON.parse(text), null, 2);
            await this._panel.webview.postMessage({
                command: 'formatResult',
                text: formatted,
                section: section
            });
        } catch (error) {
            this._showError(`Invalid JSON format: ${this._getErrorMessage(error)}`);
        }
    }

    private _getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : 'An unknown error occurred';
    }

    private _showError(message: string) {
        void this._panel.webview.postMessage({
            command: 'error',
            text: message
        });
    }

    private _getWebviewContent(): string {
        const templatePath = path.join(this._extensionPath, 'src', 'webview', 'templates', 'jwt-tool.html');
        try {
            let content = fs.readFileSync(templatePath, 'utf8');
            
            // Get the webview URI for resources
            const webviewUri = this._panel.webview.asWebviewUri(
                vscode.Uri.file(path.join(this._extensionPath, 'src', 'webview', 'templates'))
            );

            // Replace any potential resource paths in the HTML
            content = content.replace(/\${webview.cspSource}/g, webviewUri.toString());

            return content;

        } catch (error) {
            console.error('Failed to load webview template:', error);
            return `<!DOCTYPE html>
                    <html lang="en">
                    <body>
                        <h1>Error loading JWT Tool interface</h1>
                        <p>Please check the extension installation.</p>
                    </body>
                    </html>`;
        }
    }

    public dispose() {
        JWTToolPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}