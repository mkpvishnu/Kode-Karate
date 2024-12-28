"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarateCodeLensProvider = void 0;
const vscode = require("vscode");
class KarateCodeLensProvider {
    provideCodeLenses(document) {
        const codeLenses = [];
        const text = document.getText();
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('Scenario:')) {
                const range = new vscode.Range(i, 0, i, line.length);
                const command = {
                    title: '▶ Run Scenario',
                    command: 'karate-runner.runScenario',
                    arguments: [i, document.uri.fsPath]
                };
                codeLenses.push(new vscode.CodeLens(range, command));
            }
        }
        return codeLenses;
    }
}
exports.KarateCodeLensProvider = KarateCodeLensProvider;
//# sourceMappingURL=codeLensProvider.js.map