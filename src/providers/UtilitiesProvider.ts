import * as vscode from 'vscode';
import { CurlConverterPanel } from './CurlConverterPanel';
import { ResponseDiffPanel } from './ResponseDiffPanel';
import { JWTToolPanel } from './JWTToolPanel';

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
            ),
            new UtilityItem(
                'JWT Tool',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'karateUtilities.openJWTTool',
                    title: 'JWT Encode/Decode Tool',
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
        
        // Assign appropriate icons based on utility type
        switch (label) {
            case 'Response Diff Tool':
                this.iconPath = new vscode.ThemeIcon('diff');
                break;
            case 'JWT Tool':
                this.iconPath = new vscode.ThemeIcon('key');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('arrow-swap');
        }
        
        this.contextValue = 'utility';
    }
}