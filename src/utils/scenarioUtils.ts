import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function getScenarioName(document: vscode.TextDocument, line: number): string | undefined {
    const text = document.lineAt(line).text;
    const match = text.match(/Scenario:(.+)/);
    return match ? match[1].trim() : undefined;
}

export async function validateFeatureFile(filePath: string): Promise<boolean> {
    if (!filePath.endsWith('.feature')) {
        throw new Error('Not a Karate feature file');
    }
    return true;
}

export function getReportPath(workspaceFolder: vscode.WorkspaceFolder): string {
    return path.join(
        workspaceFolder.uri.fsPath,
        'target',
        'karate-reports',
        'karate-summary.html'
    );
}

export function openReport(reportPath: string): void {
    if (fs.existsSync(reportPath)) {
        vscode.env.openExternal(vscode.Uri.file(reportPath));
    }
}