"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProviders = void 0;
const vscode = require("vscode");
const codeLensProvider_1 = require("./codeLensProvider");
const completionProvider_1 = require("./completionProvider");
const hoverProvider_1 = require("./hoverProvider");
function registerProviders(context, services) {
    // Register CodeLens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider('karate', new codeLensProvider_1.KarateCodeLensProvider());
    // Register completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider('karate', new completionProvider_1.KarateCompletionProvider());
    // Register hover provider
    const hoverProvider = vscode.languages.registerHoverProvider('karate', new hoverProvider_1.KarateHoverProvider());
    // Add to subscriptions
    context.subscriptions.push(codeLensProvider, completionProvider, hoverProvider);
}
exports.registerProviders = registerProviders;
//# sourceMappingURL=index.js.map