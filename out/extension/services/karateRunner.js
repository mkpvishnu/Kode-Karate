"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KarateRunner = void 0;
const vscode = require("vscode");
const path = require("path");
const child_process_1 = require("child_process");
class KarateRunner {
    constructor(context, outputChannel) {
        this.context = context;
        this.pythonProcess = null;
        this.isRunning = false;
        this.outputChannel = outputChannel;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.updateStatus('ready');
    }
    updateStatus(status) {
        switch (status) {
            case 'ready':
                this.statusBarItem.text = "$(beaker) Karate Ready";
                this.statusBarItem.command = 'karate-runner.runTest';
                break;
            case 'running':
                this.statusBarItem.text = "$(sync~spin) Running Karate Test";
                this.statusBarItem.command = undefined;
                break;
            case 'error':
                this.statusBarItem.text = "$(error) Karate Error";
                this.statusBarItem.command = 'karate-runner.runTest';
                break;
        }
        this.statusBarItem.show();
    }
    async initializePythonProcess() {
        if (this.pythonProcess) {
            return;
        }
        const pythonPath = path.join(this.context.extensionPath, 'src', 'python');
        const scriptPath = path.join(pythonPath, 'karate_runner.py');
        // Get Python path from configuration
        const config = vscode.workspace.getConfiguration('karateRunner');
        const pythonCommand = config.get('python.path', 'python3');
        this.pythonProcess = (0, child_process_1.spawn)(pythonCommand, [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.pythonProcess.stdout?.on('data', (data) => {
            this.handlePythonOutput(data.toString());
        });
        this.pythonProcess.stderr?.on('data', (data) => {
            const error = data.toString();
            this.outputChannel.appendLine(`Error: ${error}`);
            this.updateStatus('error');
            // Show error message
            if (error.includes('CERTIFICATE_VERIFY_FAILED')) {
                vscode.window.showErrorMessage('SSL Certificate verification failed. Please check your Python SSL certificates.', 'More Info').then(selection => {
                    if (selection === 'More Info') {
                        vscode.env.openExternal(vscode.Uri.parse('https://github.com/karatelabs/karate#ssl-certificate-issues'));
                    }
                });
            }
        });
        this.pythonProcess.on('close', (code) => {
            this.outputChannel.appendLine(`Python process exited with code ${code}`);
            this.pythonProcess = null;
            this.updateStatus('ready');
        });
    }
    handlePythonOutput(output) {
        try {
            const data = JSON.parse(output);
            switch (data.type) {
                case 'test_start':
                    this.isRunning = true;
                    this.updateStatus('running');
                    this.outputChannel.appendLine(`Starting test: ${data.file}`);
                    break;
                case 'test_end':
                    this.isRunning = false;
                    this.updateStatus('ready');
                    this.outputChannel.appendLine(`Test completed: ${data.status}`);
                    break;
                case 'error':
                    this.updateStatus('error');
                    this.outputChannel.appendLine(`Error: ${data.message}`);
                    vscode.window.showErrorMessage(`Karate test error: ${data.message}`);
                    break;
                case 'output':
                    this.outputChannel.appendLine(data.line);
                    break;
                default:
                    this.outputChannel.appendLine(output);
            }
        }
        catch {
            // If not JSON, treat as plain text
            this.outputChannel.appendLine(output);
        }
    }
    async runTest(filePath, scenario) {
        if (this.isRunning) {
            vscode.window.showWarningMessage('A test is already running');
            return;
        }
        await this.initializePythonProcess();
        if (!this.pythonProcess) {
            throw new Error('Failed to initialize Python process');
        }
        const command = {
            command: 'run_test',
            file: filePath,
            scenario: scenario
        };
        this.pythonProcess.stdin?.write(JSON.stringify(command) + '\n');
    }
    dispose() {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }
        this.statusBarItem.dispose();
    }
}
exports.KarateRunner = KarateRunner;
//# sourceMappingURL=karateRunner.js.map