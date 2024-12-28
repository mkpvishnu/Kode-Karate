"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarateRunner = void 0;
const vscode = require("vscode");
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
                if (scenarioName) {
                    args.push('--name', scenarioName);
                }
                this.outputChannel.appendLine(`Running command: ${this.java11Path} ${args.join(' ')}\n`);
                const process = (0, child_process_1.spawn)(this.java11Path, args, {
                    cwd: workspaceFolder.uri.fsPath
                });
                let testFailed = false;
                process.stdout.on('data', (data) => {
                    const output = data.toString();
                    if (output.trim()) {
                        this.outputChannel.append(output);
                    }
                });
                process.stderr.on('data', (data) => {
                    const error = data.toString();
                    if (error.trim()) {
                        this.outputChannel.append(error);
                        testFailed = true;
                    }
                });
                process.on('close', async (code) => {
                    this.outputChannel.appendLine('\n' + '='.repeat(80));
                    if (code !== 0 || testFailed) {
                        this.outputChannel.appendLine('Test Failed');
                        await this.updateRunHistory(filePath, scenarioName, false);
                        reject(new Error('Test execution failed'));
                    }
                    else {
                        this.outputChannel.appendLine('Test Passed');
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
}
exports.KarateRunner = KarateRunner;
//# sourceMappingURL=karateRunner.js.map