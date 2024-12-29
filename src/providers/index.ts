import * as vscode from 'vscode';
import { KARATE_KEYWORDS, HOVER_INFO } from '../constants';

export class KarateCodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void>;

    public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Add Run Feature button at the top of the file
        const featureMatch = text.match(/Feature:.*/);
        if (featureMatch) {
            const featureLine = lines.findIndex(line => line.includes('Feature:'));
            const range = new vscode.Range(featureLine, 0, featureLine, lines[featureLine].length);
            codeLenses.push(new vscode.CodeLens(range, {
                title: "▶ Run Feature",
                command: 'karateFeatureExplorer.runFeature',
                arguments: [{
                    featurePath: document.uri.fsPath,
                    label: undefined
                }]
            }));
        }

        // Add Run Scenario buttons
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
                const scenarioName = line.substring(line.indexOf(':') + 1).trim();
                const range = new vscode.Range(i, 0, i, line.length);
                codeLenses.push(new vscode.CodeLens(range, {
                    title: "▶ Run Scenario",
                    command: 'karateFeatureExplorer.runScenario',
                    arguments: [{
                        featurePath: document.uri.fsPath,
                        label: scenarioName
                    }]
                }));
            }
        }

        return codeLenses;
    }
}

export class KarateCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completionItems: vscode.CompletionItem[] = [];
        
        // Add Karate keywords
        KARATE_KEYWORDS.forEach(keyword => {
            const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
            item.documentation = HOVER_INFO[keyword] || '';
            completionItems.push(item);
        });

        return completionItems;
    }
}

export class KarateHoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        const word = document.getText(range);
        const hoverText = HOVER_INFO[word];
        
        if (hoverText) {
            return new vscode.Hover(hoverText);
        }

        return null;
    }
}