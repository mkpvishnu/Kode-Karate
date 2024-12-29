import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class JWTToolPanel {
    public static currentPanel: JWTToolPanel | undefined;
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
                    case 'decode':
                        this._decodeJWT(message.token);
                        return;
                    case 'encode':
                        this._encodeJWT(message.header, message.payload, message.secret);
                        return;
                    case 'validateToken':
                        this._validateToken(message.token, message.secret);
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

        if (JWTToolPanel.currentPanel) {
            JWTToolPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'jwtTool',
            'JWT Tool',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        JWTToolPanel.currentPanel = new JWTToolPanel(panel, extensionPath);
    }

    private _decodeJWT(token: string) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            const decoded = {
                header: JSON.parse(this._base64UrlDecode(parts[0])),
                payload: JSON.parse(this._base64UrlDecode(parts[1])),
                signature: parts[2]
            };

            // Add human-readable dates for timestamp fields
            if (decoded.payload.exp) {
                decoded.payload.expiry = new Date(decoded.payload.exp * 1000).toLocaleString();
            }
            if (decoded.payload.iat) {
                decoded.payload.issuedAt = new Date(decoded.payload.iat * 1000).toLocaleString();
            }
            if (decoded.payload.nbf) {
                decoded.payload.notBefore = new Date(decoded.payload.nbf * 1000).toLocaleString();
            }

            this._panel.webview.postMessage({
                command: 'decodedJWT',
                decoded: decoded
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this._showError('Failed to decode JWT: ' + errorMessage);
        }
    }

    private _encodeJWT(header: string, payload: string, secret: string) {
        try {
            const headerObj = JSON.parse(header);
            const payloadObj = JSON.parse(payload);

            // Encode header and payload
            const encodedHeader = this._base64UrlEncode(JSON.stringify(headerObj));
            const encodedPayload = this._base64UrlEncode(JSON.stringify(payloadObj));

            // Create signature
            const signature = this._createSignature(encodedHeader + '.' + encodedPayload, secret);

            // Combine all parts
            const token = encodedHeader + '.' + encodedPayload + '.' + signature;

            this._panel.webview.postMessage({
                command: 'encodedJWT',
                token: token
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this._showError('Failed to encode JWT: ' + errorMessage);
        }
    }

    private _validateToken(token: string, secret: string) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            // Verify signature
            const expectedSignature = this._createSignature(parts[0] + '.' + parts[1], secret);
            const isValid = expectedSignature === parts[2];

            // Check expiry
            const payload = JSON.parse(this._base64UrlDecode(parts[1]));
            let isExpired = false;
            if (payload.exp) {
                isExpired = Date.now() >= payload.exp * 1000;
            }

            this._panel.webview.postMessage({
                command: 'validationResult',
                isValid: isValid,
                isExpired: isExpired
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this._showError('Failed to validate JWT: ' + errorMessage);
        }
    }

    private _base64UrlDecode(str: string): string {
        // Add padding if needed
        let output = str.replace(/-/g, '+').replace(/_/g, '/');
        switch (output.length % 4) {
            case 0:
                break;
            case 2:
                output += '==';
                break;
            case 3:
                output += '=';
                break;
            default:
                throw new Error('Invalid base64url string!');
        }
        return Buffer.from(output, 'base64').toString();
    }

    private _base64UrlEncode(str: string): string {
        return Buffer.from(str)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    private _createSignature(input: string, secret: string): string {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(input);
        const digest = hmac.digest('base64'); // Get base64 string directly
        return digest
            .replace(/\\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
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
            <title>JWT Tool</title>
            <style>
                body {
                    padding: 24px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #f8f9fa;
                    color: #212529;
                }
                h3 {
                    color: #0d6efd;
                    margin-bottom: 16px;
                    font-weight: 600;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                textarea {
                    width: 100%;
                    min-height: 120px;
                    margin: 12px 0;
                    padding: 12px;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    font-family: inherit;
                    font-size: 14px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                textarea:focus {
                    border-color: #0d6efd;
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
                }
                input[type="text"] {
                    width: 100%;
                    padding: 8px 12px;
                    margin: 8px 0;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                input[type="text"]:focus {
                    border-color: #0d6efd;
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
                }
                .jwt-part {
                    padding: 20px;
                    margin: 16px 0;
                    border-radius: 8px;
                    background-color: white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }
                .jwt-header { border-left: 4px solid #fb015b; }
                .jwt-payload { border-left: 4px solid #d63aff; }
                .jwt-signature { border-left: 4px solid #00f5d4; }
                .button-container {
                    margin: 16px 0;
                    display: flex;
                    gap: 12px;
                }
                button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    background-color: #0d6efd;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background-color 0.2s, transform 0.1s;
                }
                button:hover {
                    background-color: #0b5ed7;
                }
                button:active {
                    transform: scale(0.98);
                }
                .error {
                    color: #dc3545;
                    margin: 16px 0;
                    padding: 12px;
                    background-color: #f8d7da;
                    border-radius: 6px;
                    border: 1px solid #f5c6cb;
                }
                .validation-status {
                    padding: 12px;
                    margin: 16px 0;
                    border-radius: 6px;
                    font-weight: 500;
                }
                .valid {
                    background-color: #d1e7dd;
                    color: #0f5132;
                    border: 1px solid #badbcc;
                }
                .invalid {
                    background-color: #f8d7da;
                    color: #842029;
                    border: 1px solid #f5c6cb;
                }
                #encodeSection {
                    margin-top: 32px;
                    padding-top: 32px;
                    border-top: 1px solid #dee2e6;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div id="decodeSection">
                    <h3>Decode JWT</h3>
                    <textarea id="jwtInput" placeholder="Paste your JWT token here..."></textarea>
                    <div class="button-container">
                        <button onclick="decodeJWT()">Decode</button>
                        <button onclick="validateJWT()">Validate</button>
                    </div>
                    <input type="text" id="secretInput" placeholder="Secret for validation" style="display:none;">
                    <div id="decodedOutput"></div>
                </div>
                <div id="encodeSection">
                    <h3>Encode JWT</h3>
                    <textarea id="headerInput" placeholder="Enter JWT header (JSON)..."></textarea>
                    <textarea id="payloadInput" placeholder="Enter JWT payload (JSON)..."></textarea>
                    <input type="text" id="encodeSecretInput" placeholder="Enter secret for signing...">
                    <div class="button-container">
                        <button onclick="encodeJWT()">Encode</button>
                    </div>
                    <div id="encodedOutput"></div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function decodeJWT() {
                    const token = document.getElementById('jwtInput').value.trim();
                    if (token) {
                        vscode.postMessage({
                            command: 'decode',
                            token: token
                        });
                    }
                }

                function validateJWT() {
                    const secretInput = document.getElementById('secretInput');
                    secretInput.style.display = secretInput.style.display === 'none' ? 'block' : 'none';
                    
                    if (secretInput.style.display === 'block' && secretInput.value) {
                        const token = document.getElementById('jwtInput').value.trim();
                        vscode.postMessage({
                            command: 'validateToken',
                            token: token,
                            secret: secretInput.value
                        });
                    }
                }

                function encodeJWT() {
                    const header = document.getElementById('headerInput').value.trim();
                    const payload = document.getElementById('payloadInput').value.trim();
                    const secret = document.getElementById('encodeSecretInput').value.trim();
                    
                    if (header && payload && secret) {
                        vscode.postMessage({
                            command: 'encode',
                            header: header,
                            payload: payload,
                            secret: secret
                        });
                    }
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'decodedJWT':
                            displayDecodedJWT(message.decoded);
                            break;
                        case 'encodedJWT':
                            displayEncodedJWT(message.token);
                            break;
                        case 'validationResult':
                            displayValidation(message.isValid, message.isExpired);
                            break;
                        case 'error':
                            showError(message.text);
                            break;
                    }
                });

                function displayDecodedJWT(decoded) {
                    let html = '';
                    
                    // Header
                    html += '<div class="jwt-part jwt-header">';
                    html += '<h4>HEADER</h4>';
                    html += '<pre>' + JSON.stringify(decoded.header, null, 2) + '</pre>';
                    html += '</div>';

                    // Payload
                    html += '<div class="jwt-part jwt-payload">';
                    html += '<h4>PAYLOAD</h4>';
                    html += '<pre>' + JSON.stringify(decoded.payload, null, 2) + '</pre>';
                    html += '</div>';

                    // Signature
                    html += '<div class="jwt-part jwt-signature">';
                    html += '<h4>SIGNATURE</h4>';
                    html += '<pre>' + decoded.signature + '</pre>';
                    html += '</div>';

                    document.getElementById('decodedOutput').innerHTML = html;
                }

                function displayEncodedJWT(token) {
                    const outputDiv = document.getElementById('encodedOutput');
                    outputDiv.innerHTML =
                        '<div class="jwt-part">' +
                        '<h4>Encoded JWT</h4>' +
                        '<pre>' + token + '</pre>' +
                        '</div>';
                }

                function displayValidation(isValid, isExpired) {
                    const statusDiv = document.createElement('div');
                    statusDiv.className = 'validation-status ' + (isValid ? 'valid' : 'invalid');
                    statusDiv.textContent = isValid ? 'Signature is valid' : 'Invalid signature';
                    if (isExpired) {
                        statusDiv.textContent += ' (Token is expired)';
                    }
                    
                    const existingStatus = document.querySelector('.validation-status');
                    if (existingStatus) {
                        existingStatus.remove();
                    }
                    document.getElementById('decodedOutput').prepend(statusDiv);
                }

                function showError(message) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error';
                    errorDiv.textContent = message;
                    
                    const existingError = document.querySelector('.error');
                    if (existingError) {
                        existingError.remove();
                    }
                    document.querySelector('.container').prepend(errorDiv);
                    
                    setTimeout(() => errorDiv.remove(), 3000);
                }
            </script>
        </body>
        </html>`;
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