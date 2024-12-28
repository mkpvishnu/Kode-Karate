"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFeatureFile = exports.getScenarioName = void 0;
function getScenarioName(document, line) {
    const text = document.lineAt(line).text;
    const match = text.match(/Scenario:(.+)/);
    return match ? match[1].trim() : undefined;
}
exports.getScenarioName = getScenarioName;
function parseFeatureFile(document) {
    const scenarios = [];
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
exports.parseFeatureFile = parseFeatureFile;
//# sourceMappingURL=scenarioParser.js.map