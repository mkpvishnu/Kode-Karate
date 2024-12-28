"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationView = void 0;
const config_1 = require("../config");
class ConfigurationView {
    constructor(webview) {
        this._view = webview;
    }
    async render() {
        const config = config_1.ConfigurationManager.getLoggingConfig();
        this._view.webview.html = this.getHtml(config);
    }
    getHtml(config) {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                .config-container {
                    padding: 15px;
                }
                .section {
                    margin-bottom: 20px;
                    padding: 10px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                }
                .section-title {
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: var(--vscode-editor-foreground);
                }
                .option-group {
                    margin: 10px 0;
                }
                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    cursor: pointer;
                    margin: 5px;
                    border-radius: 3px;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .selected {
                    background: var(--vscode-button-hoverBackground);
                }
                .logback-file {
                    margin-top: 10px;
                    padding: 10px;
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    word-break: break-all;
                }
                .description {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin: 5px 0;
                }
            </style>
        </head>
        <body>
            <div class="config-container">
                <div class="section">
                    <div class="section-title">Output Mode</div>
                    <div class="description">Choose how test output should be handled</div>
                    <div class="option-group">
                        <button class="${config.outputMode === 'extension' ? 'selected' : ''}"
                            onclick="updateOutputMode('extension')">
                            Extension Output
                        </button>
                        <button class="${config.outputMode === 'logback' ? 'selected' : ''}"
                            onclick="updateOutputMode('logback')">
                            Logback Configuration
                        </button>
                    </div>
                </div>

                ${config.outputMode === 'logback' ? `
                <div class="section">
                    <div class="section-title">Logback Configuration</div>
                    <div class="description">Select a logback configuration file for detailed logging</div>
                    <div class="logback-file">
                        Current file: ${config.logbackFile || 'None selected'}
                    </div>
                    <div class="option-group">
                        <button onclick="selectLogbackFile()">
                            Select Logback File
                        </button>
                        ${config.logbackFile ? `
                        <button onclick="updateOutputMode('extension')">
                            Clear Selection
                        </button>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function updateOutputMode(mode) {
                    vscode.postMessage({
                        command: 'updateOutputMode',
                        value: mode
                    });
                }

                function selectLogbackFile() {
                    vscode.postMessage({
                        command: 'selectLogbackFile'
                    });
                }
            </script>
        </body>
        </html>`;
    }
}
exports.ConfigurationView = ConfigurationView;
ConfigurationView.viewType = 'karateConfiguration';
//# sourceMappingURL=configurationView.js.map