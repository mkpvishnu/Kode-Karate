import * as vscode from 'vscode';
import * as path from 'path';
import { BugInfo } from '../../models/bugConfig';

export class BugItem extends vscode.TreeItem {
    constructor(
        public readonly bugInfo: BugInfo,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(BugItem.getLabel(bugInfo), collapsibleState);
        
        this.tooltip = this.getTooltip();
        this.description = bugInfo.status?.status || 'Unknown';
        this.contextValue = 'bug';
        
        // Set icon based on status
        this.iconPath = this.getIconPath();
        
        // Set command for when item is clicked
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [
                vscode.Uri.file(bugInfo.filePath),
                {
                    selection: new vscode.Range(
                        bugInfo.lineNumber,
                        0,
                        bugInfo.lineNumber,
                        0
                    )
                }
            ]
        };
    }

    private static getLabel(bugInfo: BugInfo): string {
        return `${bugInfo.id} - ${path.basename(bugInfo.filePath)}`;
    }

    private getTooltip(): string {
        const parts = [
            `ID: ${this.bugInfo.id}`,
            `File: ${this.bugInfo.filePath}`,
            `Line: ${this.bugInfo.lineNumber + 1}`,
            `Scenario: ${this.bugInfo.scenarioName}`
        ];

        if (this.bugInfo.status?.title) {
            parts.push(`Title: ${this.bugInfo.status.title}`);
        }
        if (this.bugInfo.status?.status) {
            parts.push(`Status: ${this.bugInfo.status.status}`);
        }
        if (this.bugInfo.status?.error) {
            parts.push(`Error: ${this.bugInfo.status.error}`);
        }

        return parts.join('\n');
    }

    private getIconPath(): vscode.ThemeIcon {
        const status = this.bugInfo.status?.status?.toLowerCase() || '';
        
        // Use ThemeIcon for standard statuses
        switch (status) {
            case 'done':
            case 'closed':
            case 'resolved':
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
            case 'in progress':
            case 'active':
                return new vscode.ThemeIcon('sync', new vscode.ThemeColor('testing.iconQueued'));
            case 'error':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
            default:
                return new vscode.ThemeIcon('bug');
        }
    }
}
