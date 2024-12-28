"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationManager = void 0;
const vscode = require("vscode");
const path = require("path");
const glob = require("glob");
const util_1 = require("util");
const globPromise = (0, util_1.promisify)(glob);
class ConfigurationManager {
    /**
     * Find all logback configuration files in the workspace
     */
    static async findLogbackFiles() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }
        const pattern = path.join(workspaceFolder.uri.fsPath, '**/*logback*.xml');
        try {
            const files = await globPromise(pattern, { ignore: '**/node_modules/**' });
            return files.map(file => path.relative(workspaceFolder.uri.fsPath, file));
        }
        catch (error) {
            console.error('Error finding logback files:', error);
            return [];
        }
    }
    /**
     * Get current logging configuration
     */
    static getLoggingConfig() {
        const config = vscode.workspace.getConfiguration('karateRunner.logging');
        return {
            outputMode: config.get('outputMode', 'extension'),
            logbackFile: config.get('logbackFile')
        };
    }
    /**
     * Update logback file configuration
     */
    static async updateLogbackFile(filePath) {
        const config = vscode.workspace.getConfiguration('karateRunner.logging');
        await config.update('logbackFile', filePath, vscode.ConfigurationTarget.Workspace);
    }
    /**
     * Update output mode configuration
     */
    static async updateOutputMode(mode) {
        const config = vscode.workspace.getConfiguration('karateRunner.logging');
        await config.update('outputMode', mode, vscode.ConfigurationTarget.Workspace);
    }
    /**
     * Configure logging through UI
     */
    static async configureLoggingUI() {
        // First select output mode
        const outputMode = await vscode.window.showQuickPick([
            { label: 'Extension Output', value: 'extension', description: 'Use VS Code Extension Output' },
            { label: 'Logback', value: 'logback', description: 'Use Custom Logback Configuration' }
        ], {
            placeHolder: 'Select output mode',
            title: 'Karate Runner - Output Mode'
        });
        if (!outputMode) {
            return;
        }
        await this.updateOutputMode(outputMode.value);
        if (outputMode.value === 'logback') {
            // Find and let user select logback file
            const files = await this.findLogbackFiles();
            if (files.length === 0) {
                const create = await vscode.window.showWarningMessage('No logback configuration files found in workspace. Would you like to create one?', 'Yes', 'No');
                if (create === 'Yes') {
                    await this.createDefaultLogbackConfig();
                    return;
                }
                else {
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
            }
            else {
                await this.updateOutputMode('extension');
            }
        }
        else {
            await this.updateLogbackFile(undefined);
            vscode.window.showInformationMessage('Using VS Code Extension Output');
        }
    }
    /**
     * Create a default logback configuration file
     */
    static async createDefaultLogbackConfig() {
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
            await vscode.workspace.fs.writeFile(vscode.Uri.file(logbackPath), Buffer.from(defaultConfig, 'utf8'));
            await this.updateLogbackFile('logback-test.xml');
            vscode.window.showInformationMessage('Created default logback configuration: logback-test.xml');
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to create logback configuration file');
            console.error('Error creating logback file:', error);
        }
    }
    /**
     * Handle configuration changes
     */
    static async handleConfigChange() {
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
            }
            else {
                await this.updateOutputMode('extension');
            }
        }
    }
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=config.js.map