import * as vscode from 'vscode';
import { Services } from '../services/initialize';
import { getScenarioName } from '../utils/scenarioParser';

export function registerRunScenarioCommand(
    context: vscode.ExtensionContext,
    services: Services
): void {
    const command = vscode.commands.registerCommand(
        'karate-runner.runScenario',
        async (line: number, filePath: string) => {
            try {
                const document = await vscode.workspace.openTextDocument(filePath);
                const scenarioName = getScenarioName(document, line);
                
                if (scenarioName) {
                    await services.runner.runTest(filePath, scenarioName);
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                vscode.window.showErrorMessage(`Failed to run scenario: ${errorMessage}`);
                services.outputChannel.appendLine(`Error: ${errorMessage}`);
            }
        }
    );

    context.subscriptions.push(command);
}