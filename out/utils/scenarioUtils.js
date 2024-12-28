"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openReport = exports.getReportPath = exports.validateFeatureFile = exports.getScenarioName = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
function getScenarioName(document, line) {
    const text = document.lineAt(line).text;
    const match = text.match(/Scenario:(.+)/);
    return match ? match[1].trim() : undefined;
}
exports.getScenarioName = getScenarioName;
async function validateFeatureFile(filePath) {
    if (!filePath.endsWith('.feature')) {
        throw new Error('Not a Karate feature file');
    }
    return true;
}
exports.validateFeatureFile = validateFeatureFile;
function getReportPath(workspaceFolder) {
    return path.join(workspaceFolder.uri.fsPath, 'target', 'karate-reports', 'karate-summary.html');
}
exports.getReportPath = getReportPath;
function openReport(reportPath) {
    if (fs.existsSync(reportPath)) {
        vscode.env.openExternal(vscode.Uri.file(reportPath));
    }
}
exports.openReport = openReport;
//# sourceMappingURL=scenarioUtils.js.map