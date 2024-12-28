"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeServices = void 0;
const vscode = require("vscode");
const karateRunner_1 = require("./karateRunner");
const configuration_1 = require("../utils/configuration");
function initializeServices(context) {
    const outputChannel = vscode.window.createOutputChannel('Karate Runner');
    const runner = new karateRunner_1.KarateRunner(context, outputChannel);
    const configManager = new configuration_1.ConfigurationManager();
    // Register cleanup
    context.subscriptions.push(outputChannel, runner, configManager);
    return {
        runner,
        configManager,
        outputChannel
    };
}
exports.initializeServices = initializeServices;
//# sourceMappingURL=initialize.js.map