import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BugItem } from './bugItem';
import { BugInfo, BugConfig } from '../../models/bugConfig';
import { BugStatusService } from '../../services/bugStatusService';

export class BugExplorerProvider implements vscode.TreeDataProvider<BugItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BugItem | undefined | null | void> = new vscode.EventEmitter<BugItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BugItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private bugList: BugInfo[] = [];
    private config: BugConfig | undefined;

    constructor(private workspaceRoot: string) {
        this.loadConfiguration();
        this.scanWorkspace();
    }

    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration();
        this.config = {
            apiEndpoint: config.get('karateRunner.bugTracker.apiEndpoint', ''),
            headers: config.get('karateRunner.bugTracker.headers', {}),
            idPattern: config.get('karateRunner.bugTracker.idPattern', '@bug/{{id}}'),
            method: config.get('karateRunner.bugTracker.method', 'GET') as 'GET' | 'POST',
            payload: config.get('karateRunner.bugTracker.payload', ''),
            responseParser: config.get('karateRunner.bugTracker.responseParser', {
                statusPath: 'status',
                titlePath: 'title',
                linkPath: 'url',
                statusMapping: {}
            })
        };
    }

    public getTreeItem(element: BugItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element?: BugItem): Thenable<BugItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }

        if (element) {
            return Promise.resolve([]); // No nested items for now
        } else {
            return Promise.resolve(this.getBugItems());
        }
    }

    private async getBugItems(): Promise<BugItem[]> {
        return this.bugList.map(bug => new BugItem(bug, vscode.TreeItemCollapsibleState.None));
    }

    public refresh(): void {
        this.loadConfiguration();
        this.scanWorkspace();
        BugStatusService.getInstance().clearCache();
        this._onDidChangeTreeData.fire();
    }

    private async scanWorkspace(): Promise<void> {
        if (!this.workspaceRoot || !this.config) {
            return;
        }

        const pattern = new vscode.RelativePattern(this.workspaceRoot, '**/*.feature');
        const files = await vscode.workspace.findFiles(pattern);

        this.bugList = [];
        
        for (const file of files) {
            const content = await fs.promises.readFile(file.fsPath, 'utf8');
            const bugs = this.findBugsInFile(content, file.fsPath);
            this.bugList.push(...bugs);
        }

        // Sort bugs by file path and line number
        this.bugList.sort((a, b) => {
            const pathCompare = a.filePath.localeCompare(b.filePath);
            if (pathCompare !== 0) return pathCompare;
            return a.lineNumber - b.lineNumber;
        });

        // Update bug statuses
        if (this.config.apiEndpoint) {
            const statusService = BugStatusService.getInstance();
            for (const bug of this.bugList) {
                try {
                    bug.status = await statusService.getBugStatus(bug.id, this.config);
                } catch (error) {
                    console.error(`Error fetching status for bug ${bug.id}:`, error);
                }
            }
        }
    }

    private findBugsInFile(content: string, filePath: string): BugInfo[] {
        const bugs: BugInfo[] = [];
        if (!this.config) return bugs;

        const lines = content.split('\n');
        let currentScenario = '';

        const pattern = this.config.idPattern.replace('{{id}}', '([\\w-]+)');
        const regex = new RegExp(pattern);

        lines.forEach((line, index) => {
            if (line.trim().startsWith('Scenario:')) {
                currentScenario = line.trim().substring('Scenario:'.length).trim();
            }

            const match = line.match(regex);
            if (match) {
                bugs.push({
                    id: match[1],
                    filePath,
                    lineNumber: index,
                    scenarioName: currentScenario
                });
            }
        });

        return bugs;
    }
}