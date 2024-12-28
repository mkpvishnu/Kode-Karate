"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupStatusBar = void 0;
const vscode = require("vscode");
function setupStatusBar(context) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(beaker) Karate";
    statusBarItem.tooltip = "Run Karate Tests";
    statusBarItem.command = 'karate-runner.runTest';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    return statusBarItem;
}
exports.setupStatusBar = setupStatusBar;
//# sourceMappingURL=statusBar.js.map