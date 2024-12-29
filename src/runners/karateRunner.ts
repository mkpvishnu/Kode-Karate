import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ConfigurationManager } from '../config';
import { KarateJarManager } from '../jarManager';
import { JavaFinder } from '../javaFinder';
import { getReportPath, openReport } from '../utils/scenarioUtils';
import { ClasspathManager } from '../utils/classpath/classpathManager';

export class KarateRunner {
    private outputChannel: vscode.OutputChannel;
    private jarManager: KarateJarManager;
    private karateJarPath?: string;
    private java11Path?: string;
    private featureExplorerProvider: any;
    private runHistoryProvider: any;
    private classpathManager?: ClasspathManager;

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

    private async initializeClasspathManager(workspaceFolder: vscode.WorkspaceFolder) {
        if (!this.classpathManager) {
            this.classpathManager = new ClasspathManager(workspaceFolder.uri.fsPath);
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

                // Initialize classpath manager
                await this.initializeClasspathManager(workspaceFolder);

                this.outputChannel.clear();
                this.outputChannel.show(true);
                this.outputChannel.appendLine('Running Karate test...\
');

                // Build the classpath string
                const classpath = await this.classpathManager!.getClasspathString();
                
                // Modify the command to include classpath
                const args = [
                    '-cp',
                    `${this.karateJarPath}${path.delimiter}${classpath}`,
                    'com.intuit.karate.Main',
                    filePath
                ];

                if (scenarioName) {
                    args.push('--name', scenarioName);
                }

                this.outputChannel.appendLine(`Running command: ${this.java11Path} ${args.join(' ')}\
`);

                const process = spawn(this.java11Path, args, {
                    cwd: workspaceFolder.uri.fsPath
                });

                let testFailed = false;
                let output = '';

                process.stdout.on('data', (data) => {
                    const text = data.toString();
                    output += text;
                    if (text.trim()) {
                        this.outputChannel.append(text);
                    }
                });

                process.stderr.on('data', (data) => {
                    const error = data.toString();
                    output += error;
                    if (error.trim()) {
                        this.outputChannel.append(error);
                        // Only set testFailed if it's a real error, not just warnings
                        if (!error.includes('WARN') && !error.includes('SLF4J:')) {
                            testFailed = true;
                        }
                    }
                });

                process.on('close', async (code) => {
                    this.outputChannel.appendLine('\
' + '='.repeat(80));
                    
                    // Check for actual test failures in the output
                    const hasFailedScenarios = output.includes('failed:') && !output.includes('failed: 0');
                    const hasPassedScenarios = output.includes('passed:') && output.includes('passed: 1');
                    
                    if (code !== 0 || (testFailed && !hasPassedScenarios) || hasFailedScenarios) {
                        this.outputChannel.appendLine('Test Failed');
                        await this.updateRunHistory(filePath, scenarioName, false);
                        reject(new Error('Test execution failed'));
                    } else {
                        this.outputChannel.appendLine('Test Passed');
                        await this.updateRunHistory(filePath, scenarioName, true);
                        resolve();
                    }
                    this.outputChannel.appendLine('='.repeat(80) + '\
');

                    if (this.featureExplorerProvider?.view) {
                        await this.featureExplorerProvider.view.render();
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }
}