"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarateRunner = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const config_1 = require("../config");
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
                const loggingConfig = config_1.ConfigurationManager.getLoggingConfig();
                const args = ['-jar', this.karateJarPath, filePath];
                if (loggingConfig.outputMode === 'logback' && loggingConfig.logbackFile) {
                    const logbackPath = path.join(workspaceFolder.uri.fsPath, loggingConfig.logbackFile);
                    if (fs.existsSync(logbackPath)) {
                        args.unshift(`-Dlogback.configurationFile=${loggingConfig.logbackFile}`);
                        this.outputChannel.appendLine(`Using logback configuration: ${logbackPath}\n`);
                    }
                    else {
                        this.outputChannel.appendLine(`Warning: Logback file not found: ${logbackPath}\n`);
                        this.outputChannel.appendLine('Falling back to extension output mode\n');
                    }
                }
                if (scenarioName) {
                    args.push('--name', `"${scenarioName}"`);
                }
                this.outputChannel.appendLine(`Running command: ${this.java11Path} ${args.join(' ')}\n`);
                const process = (0, child_process_1.spawn)(this.java11Path, args, {
                    cwd: workspaceFolder.uri.fsPath
                });
                let testFailed = false;
                let isCollectingJson = false;
                let jsonOutput = '';
                process.stdout.on('data', (data) => {
                    const output = data.toString();
                    const lines = output.split('\n');
                    if (loggingConfig.outputMode === 'extension' || !loggingConfig.logbackFile) {
                        this.processExtensionOutput(lines, testFailed, isCollectingJson, jsonOutput);
                    }
                    else {
                        this.outputChannel.append(output);
                    }
                });
                process.stderr.on('data', (data) => {
                    this.outputChannel.appendLine('\n⚠️ Error:');
                    this.outputChannel.appendLine(data.toString());
                    testFailed = true;
                });
                process.on('close', async (code) => {
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
                    const reportPath = (0, scenarioUtils_1.getReportPath)(workspaceFolder);
                    (0, scenarioUtils_1.openReport)(reportPath);
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
    processExtensionOutput(lines, testFailed, isCollectingJson, jsonOutput) {
        lines.forEach((line) => {
            line = line.replace(/\u001b\[\d+m/g, '').trim();
            if (!line)
                return;
            if (line.includes('match failed')) {
                testFailed = true;
                this.outputChannel.appendLine('❌ ' + line);
            }
            else if (this.isStepLine(line)) {
                this.outputChannel.appendLine('\n► ' + line);
            }
            else if (line.includes('Response:')) {
                this.outputChannel.appendLine('\n🔍 Response:');
                isCollectingJson = true;
                jsonOutput = '';
            }
            else if (isCollectingJson && this.isJsonLine(line)) {
                this.handleJsonOutput(line, jsonOutput, isCollectingJson);
            }
            else if (this.isTestSummaryLine(line)) {
                this.handleTestSummary(line, testFailed);
            }
            else if (isCollectingJson) {
                jsonOutput += line + '\n';
            }
            else if (!this.isFilteredLine(line)) {
                this.outputChannel.appendLine(line);
            }
        });
    }
    isStepLine(line) {
        return line.startsWith('Given ') || line.startsWith('When ') ||
            line.startsWith('Then ') || line.startsWith('And ') ||
            line.startsWith('* ');
    }
    isJsonLine(line) {
        return line.startsWith('{') || line.startsWith('}');
    }
    isTestSummaryLine(line) {
        return line.includes('scenarios:') && line.includes('failed:');
    }
    isFilteredLine(line) {
        return line.includes('INFO') || line.includes('karate-summary');
    }
    handleJsonOutput(line, jsonOutput, isCollectingJson) {
        jsonOutput += line + '\n';
        if (line.startsWith('}') && line.length === 1) {
            isCollectingJson = false;
            try {
                const formattedJson = JSON.stringify(JSON.parse(jsonOutput), null, 2);
                this.outputChannel.appendLine(formattedJson);
            }
            catch {
                this.outputChannel.appendLine(jsonOutput);
            }
        }
    }
    handleTestSummary(line, testFailed) {
        const failCount = line.match(/failed:\s+(\d+)/);
        if (failCount && parseInt(failCount[1]) > 0) {
            testFailed = true;
        }
        this.outputChannel.appendLine('\n📊 Test Results:');
        this.outputChannel.appendLine(line);
    }
}
exports.KarateRunner = KarateRunner;
//# sourceMappingURL=karateRunner.js.map