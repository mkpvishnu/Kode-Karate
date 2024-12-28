"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = void 0;
const vscode = require("vscode");
const scenarioUtils_1 = require("../utils/scenarioUtils");
function registerCommands(context, karateRunner) {
    // Register runScenario command
    const runScenarioCommand = vscode.commands.registerCommand('karate-runner.runScenario', async (line, filePath) => {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const scenarioName = (0, scenarioUtils_1.getScenarioName)(document, line);
            if (scenarioName) {
                await karateRunner.runKarate(filePath, scenarioName);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            vscode.window.showErrorMessage(`Failed to run scenario: ${errorMessage}`);
        }
    });
    // Register runTest command
    const runTestCommand = vscode.commands.registerCommand('karate-runner.runTest', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error('No active editor');
            }
            const document = editor.document;
            await (0, scenarioUtils_1.validateFeatureFile)(document.fileName);
            await karateRunner.runKarate(document.fileName);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            vscode.window.showErrorMessage(`Failed to run test: ${errorMessage}`);
        }
    });
    // Add commands to subscriptions
    context.subscriptions.push(runScenarioCommand, runTestCommand);
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=index.js.map