import * as vscode from 'vscode';

export interface LoggingConfig {
    outputMode: 'extension' | 'logback';
    logbackFile?: string;
}

export class ConfigurationManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('karateRunner');
    }

    getLoggingConfig(): LoggingConfig {
        return {
            outputMode: this.config.get('logging.outputMode', 'extension'),
            logbackFile: this.config.get('logging.logbackFile')
        };
    }

    async handleConfigChange(): Promise<void> {
        this.config = vscode.workspace.getConfiguration('karateRunner');
    }

    dispose(): void {
        // Cleanup if needed
    }
}

export function setupConfiguration(context: vscode.ExtensionContext): void {
    // Register configuration contribution points
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('karateRunner')) {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        })
    );
}