"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarateRunner = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const jarManager_1 = require("../jarManager");
const javaFinder_1 = require("../javaFinder");
const scenarioUtils_1 = require("../utils/scenarioUtils");
class KarateRunner {
    constructor(context, outputChannel) {
        this.outputChannel = outputChannel;
        this.jarManager = new jarManager_1.KarateJarManager(context, outputChannel);
    }
    setViewProviders(featureExplorerProvider, runHistoryProvider) {
        this.featureExplorerProvider = featureExplorerProvider;
        this.runHistoryProvider = runHistoryProvider;
    }
    async updateRunHistory(feature, scenario, passed) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder)
            return;
        const reportPath = (0, scenarioUtils_1.getReportPath)(workspaceFolder);
        const run = {
            id: (0, uuid_1.v4)(),
            feature,
            scenario,
            timestamp: new Date().toISOString(),
            result: passed ? 'passed' : 'failed',
            reportPath
        };
        const historyView = this.runHistoryProvider?.view;
        if (historyView) {
            await historyView.addRun(run);
        }
    }
    async runKarate(filePath, scenarioName) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.java11Path) {
                    this.java11Path = await javaFinder_1.JavaFinder.findJava11();
                }
                if (!this.karateJarPath) {
                    this.karateJarPath = await this.jarManager.ensureJar();
                }
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    throw new Error('No workspace folder found');
                }
                this.outputChannel.clear();
                this.outputChannel.show(true);
                this.outputChannel.appendLine('Running Karate test...\n');
                const args = ['-jar', this.karateJarPath, filePath];
                const defaultPath = path.join(workspaceFolder.uri.fsPath, 'src', 'logback.xml');
                if (fs.existsSync(defaultPath)) {
                    args.unshift(`-Dlogback.configurationFile=${defaultPath}`);
                    this.outputChannel.appendLine(`Using default logback configuration: ${defaultPath}\n`);
                }
                if (scenarioName) {
                    args.push('--name', scenarioName);
                }
                this.outputChannel.appendLine(`Running command: ${this.java11Path} ${args.join(' ')}\n`);
                const process = (0, child_process_1.spawn)(this.java11Path, args, {
                    cwd: workspaceFolder.uri.fsPath
                });
                let testFailed = false;
                let buffer = '';
                process.stdout.on('data', (data) => {
                    buffer += data.toString();
                    let lines = buffer.split('\n');
                    // Keep the last incomplete line in the buffer
                    if (!buffer.endsWith('\n')) {
                        buffer = lines.pop() || '';
                    }
                    else {
                        buffer = '';
                    }
                    this.processExtensionOutput(lines);
                });
                process.stderr.on('data', (data) => {
                    this.outputChannel.appendLine('\n⚠️ Error:');
                    this.outputChannel.appendLine(data.toString());
                    testFailed = true;
                });
                process.on('close', async (code) => {
                    // Process any remaining buffer
                    if (buffer) {
                        this.processExtensionOutput([buffer]);
                    }
                    this.outputChannel.appendLine('\n' + '='.repeat(80));
                    if (code !== 0 || testFailed) {
                        this.outputChannel.appendLine('❌ Test Failed');
                        await this.updateRunHistory(filePath, scenarioName, false);
                        reject(new Error('Test execution failed'));
                    }
                    else {
                        this.outputChannel.appendLine('✅ Test Passed');
                        await this.updateRunHistory(filePath, scenarioName, true);
                        resolve();
                    }
                    this.outputChannel.appendLine('='.repeat(80) + '\n');
                    if (this.featureExplorerProvider?.view) {
                        await this.featureExplorerProvider.view.render();
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    processExtensionOutput(lines) {
        let isCollectingJson = false;
        let jsonBuffer = '';
        lines.forEach((line) => {
            // Remove ANSI color codes
            line = line.replace(/\u001b\[\d+m/g, '').trim();
            if (!line)
                return;
            // Handle print statements
            if (line.includes('* print')) {
                this.outputChannel.appendLine('\n🖨️ Print Output:');
                const printContent = line.substring(line.indexOf('* print') + 7).trim();
                this.tryParseAndFormatJson(printContent);
                return;
            }
            // Handle Karate logs
            if (line.includes('* karate.log')) {
                this.outputChannel.appendLine('\n📝 Karate Log:');
                const logContent = line.substring(line.indexOf('* karate.log') + 12).trim();
                this.tryParseAndFormatJson(logContent);
                return;
            }
            // Handle HTTP Request
            if (line.toLowerCase().includes('request:')) {
                this.outputChannel.appendLine('\n📤 Request:');
                isCollectingJson = true;
                jsonBuffer = '';
                return;
            }
            // Handle HTTP Response
            if (line.toLowerCase().includes('response:')) {
                this.outputChannel.appendLine('\n📥 Response:');
                isCollectingJson = true;
                jsonBuffer = '';
                return;
            }
            // Collect JSON content
            if (isCollectingJson) {
                if (this.isJsonContent(line)) {
                    jsonBuffer += line + '\n';
                    if (this.isJsonComplete(jsonBuffer)) {
                        this.tryParseAndFormatJson(jsonBuffer);
                        isCollectingJson = false;
                        jsonBuffer = '';
                    }
                }
                else {
                    if (jsonBuffer) {
                        this.tryParseAndFormatJson(jsonBuffer);
                    }
                    isCollectingJson = false;
                    jsonBuffer = '';
                    this.outputChannel.appendLine(line);
                }
                return;
            }
            // Handle test failures
            if (line.includes('match failed')) {
                this.outputChannel.appendLine('\n❌ ' + line);
                return;
            }
            // Handle test steps
            if (this.isStepLine(line)) {
                this.outputChannel.appendLine('\n► ' + line);
                return;
            }
            // Handle test summary
            if (this.isTestSummaryLine(line)) {
                this.outputChannel.appendLine('\n📊 ' + line);
                return;
            }
            // Output other lines
            if (!this.isFilteredLine(line)) {
                this.outputChannel.appendLine(line);
            }
        });
    }
    isStepLine(line) {
        return line.startsWith('Given ') || line.startsWith('When ') ||
            line.startsWith('Then ') || line.startsWith('And ') ||
            line.startsWith('* ');
    }
    isJsonContent(line) {
        return line.trim().startsWith('{') ||
            line.trim().startsWith('[') ||
            line.trim().startsWith('"') ||
            line.trim().endsWith('}') ||
            line.trim().endsWith(']');
    }
    isJsonComplete(json) {
        try {
            JSON.parse(json.trim());
            return true;
        }
        catch {
            return false;
        }
    }
    tryParseAndFormatJson(content) {
        try {
            // Remove any leading/trailing quotes if they exist
            let jsonStr = content.trim();
            if (jsonStr.startsWith("'") && jsonStr.endsWith("'")) {
                jsonStr = jsonStr.slice(1, -1);
            }
            const parsed = JSON.parse(jsonStr);
            this.outputChannel.appendLine(JSON.stringify(parsed, null, 2));
        }
        catch {
            this.outputChannel.appendLine(content);
        }
    }
    isTestSummaryLine(line) {
        return line.includes('scenarios:') &&
            (line.includes('passed:') || line.includes('failed:'));
    }
    isFilteredLine(line) {
        const filtersToSkip = [
            'karate-summary',
            'HTML report:',
            'Karate version:',
            '====================================================================='
        ];
        return filtersToSkip.some(filter => line.includes(filter));
    }
}
exports.KarateRunner = KarateRunner;
//# sourceMappingURL=karateRunner.js.map