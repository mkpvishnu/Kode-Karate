import * as vscode from 'vscode';
import { KarateRunner } from '../runners/karateRunner';
import { validateFeatureFile, getScenarioName } from '../utils/scenarioUtils';

export function registerCommands(
    context: vscode.ExtensionContext,
    karateRunner: KarateRunner
) {
    // Register runScenario command
    const runScenarioCommand = vscode.commands.registerCommand(
        'karate-runner.runScenario',
        async (line: number, filePath: string) => {
            try {
                const document = await vscode.workspace.openTextDocument(filePath);
                const scenarioName = getScenarioName(document, line);
                
                if (scenarioName) {
                    await karateRunner.runKarate(filePath, scenarioName);
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                vscode.window.showErrorMessage(`Failed to run scenario: ${errorMessage}`);
            }
        }
    );

    // Register runTest command
    const runTestCommand = vscode.commands.registerCommand(
        'karate-runner.runTest',
        async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    throw new Error('No active editor');
                }

                const document = editor.document;
                await validateFeatureFile(document.fileName);
                await karateRunner.runKarate(document.fileName);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                vscode.window.showErrorMessage(`Failed to run test: ${errorMessage}`);
            }
        }
    );

    // Add commands to subscriptions
    context.subscriptions.push(runScenarioCommand, runTestCommand);
}