import * as vscode from 'vscode';

export class KarateHoverProvider implements vscode.HoverProvider {
    private hoverInfo: { [key: string]: string } = {
        'Feature': 'Top level keyword that defines a test feature',
        'Scenario': 'Defines a test scenario within a feature',
        'Given': 'Sets up the initial test state',
        'When': 'Describes the action being tested',
        'Then': 'Describes the expected outcome',
        'And': 'Adds additional context to Given, When, or Then',
        'But': 'Adds negative context to Given, When, or Then',
        'Background': 'Defines steps that run before each scenario',
        'match': 'Asserts that a value matches the expected result',
        'contains': 'Checks if one value contains another',
        'print': 'Prints a value for debugging',
        'def': 'Defines a variable',
        'path': 'Sets the URL path',
        'url': 'Sets the base URL',
        'method': 'Sets the HTTP method (get, post, etc.)',
        'status': 'Asserts the HTTP response status code',
        'callonce': 'Call a feature file once and cache the response',
        'call': 'Call another feature file or scenario'
    };

    private methodInfo: { [key: string]: string } = {
        'get': 'HTTP GET request to retrieve data',
        'post': 'HTTP POST request to create new data',
        'put': 'HTTP PUT request to update existing data',
        'delete': 'HTTP DELETE request to remove data',
        'patch': 'HTTP PATCH request for partial updates',
        'options': 'HTTP OPTIONS request to describe communication options',
        'head': 'HTTP HEAD request for response headers only'
    };

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.Hover | undefined {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return undefined;
        }

        const word = document.getText(range);
        let info = this.hoverInfo[word] || this.methodInfo[word.toLowerCase()];
        
        if (info) {
            const content = new vscode.MarkdownString();
            content.supportHtml = true;
            content.appendMarkdown(`**${word}**\n\n${info}`);
            
            return new vscode.Hover(content);
        }

        return undefined;
    }
}