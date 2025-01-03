import * as vscode from 'vscode';

export function getScenarioName(document: vscode.TextDocument, line: number): string | undefined {
    const text = document.getText();
    const lines = text.split('\n');
    let currentLine = lines[line];
    
    // Check if this is a scenario line
    if (!currentLine.trim().startsWith('Scenario:')) {
        return undefined;
    }
    
    // Extract scenario name
    const match = currentLine.match(/Scenario:(.+)/);
    if (!match) {
        return undefined;
    }
    
    // Get full scenario name including any tags
    let scenarioName = match[1].trim();
    
    // Look for tags in previous line
    if (line > 0) {
        const previousLine = lines[line - 1].trim();
        if (previousLine.startsWith('@')) {
            scenarioName = `${previousLine} ${scenarioName}`;
        }
    }
    
    return scenarioName;
}

export function validateFeatureFile(document: vscode.TextDocument): boolean {
    const text = document.getText();
    const lines = text.split('\n');
    let hasFeature = false;
    let hasScenario = false;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Feature:')) hasFeature = true;
        if (trimmed.startsWith('Scenario:')) hasScenario = true;
    }
    
    return hasFeature && hasScenario;
}

export const karateKeywords = [
    'Feature:', 'Scenario:', 'Given', 'When', 'Then', 'And', 'But',
    'Background:', 'Scenario Outline:', 'Examples:', 
    'call', 'callonce', 'def', 'print', 'assert',
    'path', 'url', 'method', 'status', 'match', 'contains',
    'configure', 'eval', 'request', 'response', 'set', 'text',
    'csv', 'table', 'replace', 'remove', 'get', 'post', 'put',
    'patch', 'delete', 'header', 'headers', 'param', 'params',
    'form field', 'multipart field', 'multipart file', 'multipart entity',
    'soap action', 'retry until', 'fuzzy', 'schema', 'yaml', 'type',
    'read', 'karate.', 'js', 'copy', 'move'
];