import * as vscode from 'vscode';
import { KarateRunner } from './karateRunner';
import { ConfigurationManager } from '../utils/configuration';

export interface Services {
    runner: KarateRunner;
    configManager: ConfigurationManager;
    outputChannel: vscode.OutputChannel;
}

export function initializeServices(context: vscode.ExtensionContext): Services {
    const outputChannel = vscode.window.createOutputChannel('Karate Runner');
    const runner = new KarateRunner(context, outputChannel);
    const configManager = new ConfigurationManager();

    // Register cleanup
    context.subscriptions.push(
        outputChannel,
        runner,
        configManager
    );

    return {
        runner,
        configManager,
        outputChannel
    };
}