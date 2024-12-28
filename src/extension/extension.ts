import * as vscode from 'vscode';
import { initializeServices } from './services/initialize';
import { registerProviders } from './providers';
import { registerCommands } from './commands';
import { setupStatusBar } from './utils/statusBar';
import { setupConfiguration } from './utils/configuration';

export function activate(context: vscode.ExtensionContext) {
    // Initialize services
    const services = initializeServices(context);
    
    // Register providers
    registerProviders(context, services);
    
    // Register commands
    registerCommands(context, services);
    
    // Setup status bar
    setupStatusBar(context);
    
    // Setup configuration
    setupConfiguration(context);

    // Subscribe to configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('karateRunner')) {
                await services.configManager.handleConfigChange();
            }
        })
    );
}

export function deactivate() {
    // Cleanup code
}