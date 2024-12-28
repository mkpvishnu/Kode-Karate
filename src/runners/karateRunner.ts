import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ConfigurationManager } from '../config';
import { KarateJarManager } from '../jarManager';
import { JavaFinder } from '../javaFinder';
import { getReportPath, openReport } from '../utils/scenarioUtils';

export class KarateRunner {
    private outputChannel: vscode.OutputChannel;
    private jarManager: KarateJarManager;
    private karateJarPath?: string;
    private java11Path?: string;
    private featureExplorerProvider: any;
    private runHistoryProvider: any;

    constructor(
        context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel
    ) {
        this.outputChannel = outputChannel;
        this.jarManager = new KarateJarManager(context, outputChannel);
    }

    public setViewProviders(featureExplorerProvider: any, runHistoryProvider: any) {
        this.featureExplorerProvider = featureExplorerProvider;
        this.runHistoryProvider = runHistoryProvider;
    }

    private async updateRunHistory(feature: string, scenario: string | undefined, passed: boolean) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        const reportPath = getReportPath(workspaceFolder);

        const run = {
            id: uuidv4(),
            feature,
            scenario,
            timestamp: new Date().toISOString(),
            result: passed ? 'passed' : 'failed',
            reportPath
        };

        const historyView = this.runHistoryProvider?.view;
        if (historyView) {
            await (historyView as any).addRun(run);
        }
    }

    public async runKarate(filePath: string, scenarioName?: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.java11Path) {
                    this.java11Path = await JavaFinder.findJava11();
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

                const process = spawn(this.java11Path, args, {
                    cwd: workspaceFolder.uri.fsPath
                });

                let testFailed = false;
                let isCollectingJson = false;
                let jsonOutput = '';

                process.stdout.on('data', (data) => {
                    const output = data.toString();
                    const lines = output.split('\n');
                    
                    this.processExtensionOutput(lines, testFailed, isCollectingJson, jsonOutput);
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
                    } else {
                        this.outputChannel.appendLine('✅ Test Passed');
                        await this.updateRunHistory(filePath, scenarioName, true);
                        resolve();
                    }
                    this.outputChannel.appendLine('='.repeat(80) + '\n');

                    const reportPath = getReportPath(workspaceFolder);
                    openReport(reportPath);

                    if (this.featureExplorerProvider?.view) {
                        await this.featureExplorerProvider.view.render();
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    private processExtensionOutput(
        lines: string[],
        testFailed: boolean,
        isCollectingJson: boolean,
        jsonOutput: string
    ): void {
        lines.forEach((line: string) => {
            line = line.replace(/\u001b\[\d+m/g, '').trim();
            
            if (!line) return;

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
            else if (line.startsWith('* print')) {
                this.outputChannel.appendLine('\n🖨️ ' + line);
            }
            else if (line.startsWith('* karate.log')) {
                this.outputChannel.appendLine('\n📝 ' + line);
            }
            else if (isCollectingJson) {
                jsonOutput += line + '\n';
            }
            else if (!this.isFilteredLine(line)) {
                this.outputChannel.appendLine(line);
            }
        });
    }

    private isStepLine(line: string): boolean {
        return line.startsWith('Given ') || line.startsWith('When ') || 
               line.startsWith('Then ') || line.startsWith('And ') || 
               line.startsWith('* ');
    }

    private isJsonLine(line: string): boolean {
        return line.startsWith('{') || line.startsWith('}');
    }

    private isTestSummaryLine(line: string): boolean {
        return line.includes('scenarios:') && line.includes('failed:');
    }

    private isFilteredLine(line: string): boolean {
        return line.includes('INFO') || line.includes('karate-summary');
    }

    private handleJsonOutput(line: string, jsonOutput: string, isCollectingJson: boolean): void {
        jsonOutput += line + '\n';
        if (line.startsWith('}') && line.length === 1) {
            isCollectingJson = false;
            try {
                const formattedJson = JSON.stringify(JSON.parse(jsonOutput), null, 2);
                this.outputChannel.appendLine(formattedJson);
            } catch {
                this.outputChannel.appendLine(jsonOutput);
            }
        }
    }

    private handleTestSummary(line: string, testFailed: boolean): void {
        const failCount = line.match(/failed:\s+(\d+)/);
        if (failCount && parseInt(failCount[1]) > 0) {
            testFailed = true;
        }
        this.outputChannel.appendLine('\n📊 Test Results:');
        this.outputChannel.appendLine(line);
    }
}