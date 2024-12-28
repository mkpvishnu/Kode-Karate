import * as vscode from 'vscode';

export class KarateCompletionProvider implements vscode.CompletionItemProvider {
    private keywords = [
        'Feature:', 'Scenario:', 'Given', 'When', 'Then', 'And', 'But',
        'Background:', 'call', 'callonce', 'def', 'print', 'assert',
        'path', 'url', 'method', 'status', 'match', 'contains'
    ];

    private methodKeywords = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        const completions: vscode.CompletionItem[] = [];

        // Add regular keywords
        this.keywords.forEach(keyword => {
            const completion = new vscode.CompletionItem(keyword);
            completion.kind = vscode.CompletionItemKind.Keyword;
            
            // Add snippets for certain keywords
            if (keyword === 'Scenario:') {
                completion.insertText = new vscode.SnippetString('Scenario: ${1:name}');
            } else if (keyword === 'Feature:') {
                completion.insertText = new vscode.SnippetString('Feature: ${1:name}\n\n');
            }
            
            completions.push(completion);
        });

        // Add HTTP method keywords if line contains 'method'
        if (linePrefix.includes('method')) {
            this.methodKeywords.forEach(method => {
                const completion = new vscode.CompletionItem(method);
                completion.kind = vscode.CompletionItemKind.EnumMember;
                completions.push(completion);
            });
        }

        return completions;
    }
}