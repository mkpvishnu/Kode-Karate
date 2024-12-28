import * as vscode from 'vscode';

export class KarateStatusBar {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.text = "$(beaker) Karate";
        this.statusBarItem.tooltip = "Run Karate Tests";
        this.statusBarItem.command = 'karate-runner.runTest';
        this.statusBarItem.show();
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}