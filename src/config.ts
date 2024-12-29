import * as vscode from 'vscode';
import * as path from 'path';
import * as glob from 'glob';
import { promisify } from 'util';

const globPromise = promisify(glob);

export interface LoggingConfig {
    outputMode: 'extension' | 'logback';
    logbackFile?: string;
}

export class ConfigurationManager {
    /**
     * Find all logback configuration files in the workspace
     */
    public static async findLogbackFiles(): Promise<string[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const pattern = path.join(workspaceFolder.uri.fsPath, '**/*logback*.xml');
        try {
            const files = await globPromise(pattern, { ignore: '**/node_modules/**' });
            return files.map(file => path.relative(workspaceFolder.uri.fsPath, file));
        } catch (error) {
            console.error('Error finding logback files:', error);
            return [];
        }
    }

    /**
     * Get current logging configuration
     */
    public static getLoggingConfig(): LoggingConfig {
        const config = vscode.workspace.getConfiguration('karateRunner.logging');
        return {
            outputMode: config.get<'extension' | 'logback'>('outputMode', 'extension'),
            logbackFile: config.get<string>('logbackFile')
        };
    }

    /**
     * Update logback file configuration
     */
    public static async updateLogbackFile(filePath?: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('karateRunner.logging');
        await config.update('logbackFile', filePath, vscode.ConfigurationTarget.Workspace);
    }

    /**
     * Update output mode configuration
     */
    public static async updateOutputMode(mode: 'extension' | 'logback'): Promise<void> {
        const config = vscode.workspace.getConfiguration('karateRunner.logging');
        await config.update('outputMode', mode, vscode.ConfigurationTarget.Workspace);
    }

    /**
     * Configure logging through UI
     */
    public static async configureLoggingUI(): Promise<void> {
        // First select output mode
        const outputMode = await vscode.window.showQuickPick(
            [
                { label: 'Extension Output', value: 'extension', description: 'Use VS Code Extension Output' },
                { label: 'Logback', value: 'logback', description: 'Use Custom Logback Configuration' }
            ],
            {
                placeHolder: 'Select output mode',
                title: 'Karate Runner - Output Mode'
            }
        );

        if (!outputMode) {
            return;
        }

        await this.updateOutputMode(outputMode.value as 'extension' | 'logback');

        if (outputMode.value === 'logback') {
            // Find and let user select logback file
            const files = await this.findLogbackFiles();
            
            if (files.length === 0) {
                const create = await vscode.window.showWarningMessage(
                    'No logback configuration files found in workspace. Would you like to create one?',
                    'Yes', 'No'
                );

                if (create === 'Yes') {
                    await this.createDefaultLogbackConfig();
                    return;
                } else {
                    await this.updateOutputMode('extension');
                    return;
                }
            }

            const selected = await vscode.window.showQuickPick(files, {
                placeHolder: 'Select logback configuration file',
                title: 'Karate Runner - Logback Configuration'
            });

            if (selected) {
                await this.updateLogbackFile(selected);
                vscode.window.showInformationMessage(`Logback configuration updated to use: ${selected}`);
            } else {
                await this.updateOutputMode('extension');
            }
        } else {
            await this.updateLogbackFile(undefined);
            vscode.window.showInformationMessage('Using VS Code Extension Output');
        }
    }

    /**
     * Create a default logback configuration file
     */
    private static async createDefaultLogbackConfig(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const defaultConfig = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <logger name="com.intuit.karate" level="INFO"/>
    <logger name="karate.print" level="INFO"/>
    
    <root level="INFO">
        <appender-ref ref="STDOUT" />
    </root>
</configuration>`;

        const logbackPath = path.join(workspaceFolder.uri.fsPath, 'logback-test.xml');
        
        try {
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(logbackPath),
                Buffer.from(defaultConfig, 'utf8')
            );
            await this.updateLogbackFile('logback-test.xml');
            vscode.window.showInformationMessage('Created default logback configuration: logback-test.xml');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to create logback configuration file');
            console.error('Error creating logback file:', error);
        }
    }

    /**
     * Handle configuration changes
     */
    public static async handleConfigChange(): Promise<void> {
        const config = this.getLoggingConfig();
        
        if (config.outputMode === 'logback' && !config.logbackFile) {
            const files = await this.findLogbackFiles();
            
            if (files.length === 0) {
                vscode.window.showWarningMessage('No logback configuration files found in workspace');
                await this.updateOutputMode('extension');
                return;
            }

            const selected = await vscode.window.showQuickPick(files, {
                placeHolder: 'Select logback configuration file'
            });

            if (selected) {
                await this.updateLogbackFile(selected);
            } else {
                await this.updateOutputMode('extension');
            }
        }
    }
}