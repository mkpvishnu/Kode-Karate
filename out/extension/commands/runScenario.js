"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRunScenarioCommand = void 0;
const vscode = require("vscode");
const scenarioParser_1 = require("../utils/scenarioParser");
function registerRunScenarioCommand(context, services) {
    const command = vscode.commands.registerCommand('karate-runner.runScenario', async (line, filePath) => {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const scenarioName = (0, scenarioParser_1.getScenarioName)(document, line);
            if (scenarioName) {
                await services.runner.runTest(filePath, scenarioName);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            vscode.window.showErrorMessage(`Failed to run scenario: ${errorMessage}`);
            services.outputChannel.appendLine(`Error: ${errorMessage}`);
        }
    });
    context.subscriptions.push(command);
}
exports.registerRunScenarioCommand = registerRunScenarioCommand;
//# sourceMappingURL=runScenario.js.map