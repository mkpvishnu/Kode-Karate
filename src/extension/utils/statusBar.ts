import * as vscode from 'vscode';

export function setupStatusBar(context: vscode.ExtensionContext): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(beaker) Karate";
    statusBarItem.tooltip = "Run Karate Tests";
    statusBarItem.command = 'karate-runner.runTest';
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);
    return statusBarItem;
}