import * as vscode from 'vscode';
import { Services } from '../services/initialize';
import { KarateCodeLensProvider } from './codeLensProvider';
import { KarateCompletionProvider } from './completionProvider';
import { KarateHoverProvider } from './hoverProvider';

export function registerProviders(
    context: vscode.ExtensionContext,
    services: Services
): void {
    // Register CodeLens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
        'karate',
        new KarateCodeLensProvider()
    );

    // Register completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'karate',
        new KarateCompletionProvider()
    );

    // Register hover provider
    const hoverProvider = vscode.languages.registerHoverProvider(
        'karate',
        new KarateHoverProvider()
    );

    // Add to subscriptions
    context.subscriptions.push(
        codeLensProvider,
        completionProvider,
        hoverProvider
    );
}