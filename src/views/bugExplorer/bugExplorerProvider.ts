import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BugItem } from './bugItem';
import { BugInfo, BugConfig } from '../../models/bugConfig';
import { BugStatusService } from '../../services/bugStatusService';

class DirectoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly bugs: BugInfo[]
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'directory';
    }
}

export class BugExplorerProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private bugList: BugInfo[] = [];
    private config: BugConfig | undefined;

    constructor(private workspaceRoot: string) {
        this.loadConfiguration();
        this.scanWorkspace();
    }

    loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration();
        this.config = {
            apiEndpoint: config.get('karateRunner.bugTracker.apiEndpoint', ''),
            headers: config.get('karateRunner.bugTracker.headers', {}),
            idPattern: config.get('karateRunner.bugTracker.idPattern', '@bug/{{id}}'),
            method: config.get('karateRunner.bugTracker.method', 'GET') as 'GET' | 'POST',
            payload: config.get('karateRunner.bugTracker.payload', ''),
            responseParser: config.get('karateRunner.bugTracker.responseParser', {
                statusPath: 'issue.status_id',
                titlePath: 'issue.title',
                linkPath: 'issue.key',
                statusMapping: {}
            })
        };
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }

        // If element is a directory, return its bugs
        if (element instanceof DirectoryItem) {
            return element.bugs
                .sort((a, b) => a.scenarioName.localeCompare(b.scenarioName))
                .map(bug => new BugItem(bug, vscode.TreeItemCollapsibleState.None));
        }

        // Root level - group bugs by directory
        const bugsByDir = new Map<string, BugInfo[]>();
        for (const bug of this.bugList) {
            const dirPath = path.dirname(bug.filePath);
            const relativePath = path.relative(this.workspaceRoot, dirPath);
            const dirName = relativePath || 'Root';

            if (!bugsByDir.has(dirName)) {
                bugsByDir.set(dirName, []);
            }
            bugsByDir.get(dirName)?.push(bug);
        }

        // Convert to array and sort
        const entries = Array.from(bugsByDir.entries())
            .sort(([a], [b]) => a.localeCompare(b));

        // If only one directory, return bugs directly
        if (entries.length === 1) {
            const [, bugs] = entries[0];
            return bugs
                .sort((a, b) => a.scenarioName.localeCompare(b.scenarioName))
                .map(bug => new BugItem(bug, vscode.TreeItemCollapsibleState.None));
        }

        // Multiple directories - return directory items
        return entries.map(([dirName, bugs]) => new DirectoryItem(dirName, bugs));
    }

    refresh(): void {
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