import * as vscode from 'vscode';
import { Services } from '../services/initialize';

export function registerRunTestCommand(
    context: vscode.ExtensionContext,
    services: Services
): void {
    const command = vscode.commands.registerCommand(
        'karate-runner.runTest',
        async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor');
                    return;
                }

                const document = editor.document;
                if (!document.fileName.endsWith('.feature')) {
                    vscode.window.showErrorMessage('Not a Karate feature file');
                    return;
                }

                await services.runner.runTest(document.fileName);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                vscode.window.showErrorMessage(`Failed to run test: ${errorMessage}`);
                services.outputChannel.appendLine(`Error: ${errorMessage}`);
            }
        }
    );

    context.subscriptions.push(command);
}