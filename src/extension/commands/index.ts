import * as vscode from 'vscode';
import { Services } from '../services/initialize';
import { registerRunScenarioCommand } from './runScenario';
import { registerRunTestCommand } from './runTest';

export function registerCommands(
    context: vscode.ExtensionContext,
    services: Services
): void {
    registerRunScenarioCommand(context, services);
    registerRunTestCommand(context, services);
}