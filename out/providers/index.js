"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarateHoverProvider = exports.KarateCompletionProvider = exports.KarateCodeLensProvider = void 0;
const vscode = require("vscode");
const constants_1 = require("../constants");
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
class KarateCompletionProvider {
    provideCompletionItems(document, position) {
        return constants_1.KARATE_KEYWORDS.map(keyword => {
            const completion = new vscode.CompletionItem(keyword);
            completion.kind = vscode.CompletionItemKind.Keyword;
            return completion;
        });
    }
}
exports.KarateCompletionProvider = KarateCompletionProvider;
class KarateHoverProvider {
    provideHover(document, position) {
        const word = document.getText(document.getWordRangeAtPosition(position));
        if (constants_1.HOVER_INFO[word]) {
            return new vscode.Hover(constants_1.HOVER_INFO[word]);
        }
    }
}
exports.KarateHoverProvider = KarateHoverProvider;
//# sourceMappingURL=index.js.map