"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupConfiguration = exports.ConfigurationManager = void 0;
const vscode = require("vscode");
class ConfigurationManager {
    constructor() {
        this.config = vscode.workspace.getConfiguration('karateRunner');
    }
    getLoggingConfig() {
        return {
            outputMode: this.config.get('logging.outputMode', 'extension'),
            logbackFile: this.config.get('logging.logbackFile')
        };
    }
    async handleConfigChange() {
        this.config = vscode.workspace.getConfiguration('karateRunner');
    }
    dispose() {
        // Cleanup if needed
    }
}
exports.ConfigurationManager = ConfigurationManager;
function setupConfiguration(context) {
    // Register configuration contribution points
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('karateRunner')) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }));
}
exports.setupConfiguration = setupConfiguration;
//# sourceMappingURL=configuration.js.map