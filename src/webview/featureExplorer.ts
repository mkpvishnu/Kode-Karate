import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class FeatureExplorerView {
    private readonly _view: vscode.WebviewView;

    constructor(webview: vscode.WebviewView) {
        this._view = webview;
    }

    public async render() {
        const features = await this.findFeatureFiles();
        const scenarios = await this.extractScenarios(features);
        
        this._view.webview.html = this.getHtml(features, scenarios);
    }

    private async findFeatureFiles(): Promise<string[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const featureFiles: string[] = [];
        const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.feature');
        const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

        return files.map(file => path.relative(workspaceFolder.uri.fsPath, file.fsPath));
    }

    private async extractScenarios(featureFiles: string[]): Promise<Map<string, string[]>> {
        const scenarioMap = new Map<string, string[]>();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        if (!workspaceFolder) {
            return scenarioMap;
        }

        for (const file of featureFiles) {
            const filePath = path.join(workspaceFolder.uri.fsPath, file);
            const content = await fs.promises.readFile(filePath, 'utf8');
            const scenarios = this.parseScenarios(content);
            scenarioMap.set(file, scenarios);
        }

        return scenarioMap;
    }

    private parseScenarios(content: string): string[] {
        const scenarios: string[] = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('Scenario:')) {
                scenarios.push(trimmed.substring('Scenario:'.length).trim());
            }
        }

        return scenarios;
    }

    private getHtml(features: string[], scenarios: Map<string, string[]>): string {
        return `<!DOCTYPE html>
        <html>
        <head>
            <style>
                .feature-tree {
                    padding: 10px;
                }
                .feature-item {
                    margin: 5px 0;
                }
                .scenario-list {
                    margin-left: 20px;
                }
                .run-button {
                    margin-left: 5px;
                    padding: 2px 6px;
                    cursor: pointer;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 3px;
                }
                .feature-header {
                    display: flex;
                    align-items: center;
                    padding: 5px;
                    cursor: pointer;
                    background: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                    margin-bottom: 2px;
                    border-radius: 3px;
                }
                .scenario-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 3px 5px;
                    margin: 2px 0;
                    background: var(--vscode-list-hoverBackground);
                    border-radius: 3px;
                }
                .scenario-name {
                    margin-right: 10px;
                }
                .collapsible {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0 5px;
                    color: var(--vscode-editor-foreground);
                }
            </style>
        </head>
        <body>
            <div class="feature-tree">
                ${features.map(feature => `
                    <div class="feature-item">
                        <div class="feature-header">
                            <button class="collapsible" onclick="toggleScenarios('${feature}')">▶</button>
                            <span>${feature}</span>
                            <button class="run-button" onclick="runFeature('${feature}')">Run</button>
                        </div>
                        <div id="${feature}" class="scenario-list" style="display: none">
                            ${scenarios.get(feature)?.map(scenario => `
                                <div class="scenario-item">
                                    <span class="scenario-name">${scenario}</span>
                                    <button class="run-button" onclick="runScenario('${feature}', '${encodeURIComponent(scenario)}')">Run</button>
                                </div>
                            `).join('') || ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                function toggleScenarios(feature) {
                    const element = document.getElementById(feature);
                    const button = event.target;
                    if (element.style.display === 'none') {
                        element.style.display = 'block';
                        button.textContent = '▼';
                    } else {
                        element.style.display = 'none';
                        button.textContent = '▶';
                    }
                }

                function runFeature(feature) {
                    vscode.postMessage({
                        command: 'runFeature',
                        feature: feature
                    });
                }

                function runScenario(feature, scenario) {
                    vscode.postMessage({
                        command: 'runScenario',
                        feature: feature,
                        scenario: decodeURIComponent(scenario)
                    });
                }
            </script>
        </body>
        </html>`;
    }
}