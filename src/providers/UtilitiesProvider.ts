import * as vscode from 'vscode';
import { CurlConverterPanel } from './CurlConverterPanel';
import { ResponseDiffPanel } from './ResponseDiffPanel';

export class UtilitiesProvider implements vscode.TreeDataProvider<UtilityItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<UtilityItem | undefined | null | void> = new vscode.EventEmitter<UtilityItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<UtilityItem | undefined | null | void> = this._onDidChangeTreeData.event;

    getTreeItem(element: UtilityItem): vscode.TreeItem {
        return element;
    }

    getChildren(): UtilityItem[] {
        return [
            new UtilityItem(
                'Request -> cURL',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'karateUtilities.openConverter',
                    title: 'Convert to cURL',
                    arguments: []
                }
            ),
            new UtilityItem(
                'Response Diff Tool',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'karateUtilities.openResponseDiff',
                    title: 'Compare API Responses',
                    arguments: []
                }
            )
        ];
    }
}

class UtilityItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.command = command;
        // Changed to arrow-right icon which better represents transformation/conversion
        this.iconPath = new vscode.ThemeIcon(label === 'Response Diff Tool' ? 'diff' : 'arrow-swap');
        this.contextValue = 'utility';
    }
}