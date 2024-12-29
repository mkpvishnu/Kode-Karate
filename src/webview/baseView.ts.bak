import * as vscode from 'vscode';

export interface BaseView {
    render(): Promise<void>;
    refresh(): Promise<void>;
}

export type RunCallback = (filePath: string, scenarioName?: string) => Promise<void>;