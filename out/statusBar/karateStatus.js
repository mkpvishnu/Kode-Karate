"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarateStatusBar = void 0;
const vscode = require("vscode");
class KarateStatusBar {
    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.statusBarItem.text = "$(beaker) Karate";
        this.statusBarItem.tooltip = "Run Karate Tests";
        this.statusBarItem.command = 'karate-runner.runTest';
        this.statusBarItem.show();
    }
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.KarateStatusBar = KarateStatusBar;
//# sourceMappingURL=karateStatus.js.map