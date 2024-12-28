import * as vscode from 'vscode';
import { KARATE_KEYWORDS, HOVER_INFO } from '../constants';
import { getScenarioName } from '../utils/scenarioUtils';

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

export class KarateCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        return KARATE_KEYWORDS.map(keyword => {
            const completion = new vscode.CompletionItem(keyword);
            completion.kind = vscode.CompletionItemKind.Keyword;
            return completion;
        });
    }
}

export class KarateHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position) {
        const word = document.getText(document.getWordRangeAtPosition(position));
        
        if (HOVER_INFO[word]) {
            return new vscode.Hover(HOVER_INFO[word]);
        }
    }
}