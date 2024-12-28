import * as vscode from 'vscode';

export function getScenarioName(document: vscode.TextDocument, line: number): string | undefined {
    const text = document.lineAt(line).text;
    const match = text.match(/Scenario:(.+)/);
    return match ? match[1].trim() : undefined;
}

export function parseFeatureFile(document: vscode.TextDocument) {
    const scenarios: { name: string; line: number }[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Scenario:')) {
            const name = line.substring('Scenario:'.length).trim();
            scenarios.push({ name, line: i });
        }
    }

    return scenarios;
}