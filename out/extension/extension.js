"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const initialize_1 = require("./services/initialize");
const providers_1 = require("./providers");
const commands_1 = require("./commands");
const statusBar_1 = require("./utils/statusBar");
const configuration_1 = require("./utils/configuration");
function activate(context) {
    // Initialize services
    const services = (0, initialize_1.initializeServices)(context);
    // Register providers
    (0, providers_1.registerProviders)(context, services);
    // Register commands
    (0, commands_1.registerCommands)(context, services);
    // Setup status bar
    (0, statusBar_1.setupStatusBar)(context);
    // Setup configuration
    (0, configuration_1.setupConfiguration)(context);
    // Subscribe to configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('karateRunner')) {
            await services.configManager.handleConfigChange();
        }
    }));
}
exports.activate = activate;
function deactivate() {
    // Cleanup code
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map