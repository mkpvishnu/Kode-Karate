import * as vscode from 'vscode';

export class KarateCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
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