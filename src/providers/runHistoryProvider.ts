import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface TestRunSummary {
    id: string;
    feature: string;
    timestamp: string;
    duration: number;
    scenariosPassed: number;
    scenariosFailed: number;
    reportPath: string;
}

interface TestRunGroup {
    date: string;
    runs: TestRunSummary[];
}

export class HistoryTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'group' | 'run' | 'report',
        public readonly data?: TestRunSummary
    ) {
        super(label, collapsibleState);

        if (type === 'run' && data) {
            const time = new Date(data.timestamp).toLocaleTimeString();
            const status = data.scenariosFailed > 0 ? '❌' : '✅';
            const duration = (data.duration / 1000).toFixed(2);
            
            this.description = `${time} - ${status} ${data.scenariosPassed}/${data.scenariosPassed + data.scenariosFailed} [${duration}s]`;
            this.iconPath = new vscode.ThemeIcon('file');
            this.contextValue = 'testRun';
            
            // Use tooltip to show full details
            this.tooltip = new vscode.MarkdownString([
                `**Feature:** ${data.feature}`,
                `**Time:** ${new Date(data.timestamp).toLocaleString()}`,
                `**Duration:** ${duration}s`,
                `**Scenarios:** ✅ ${data.scenariosPassed} / ❌ ${data.scenariosFailed}`,
                `**Report:** ${data.reportPath}`
            ].join('\n'));
        } else if (type === 'report' && data) {
            this.label = "View Report";
            this.iconPath = new vscode.ThemeIcon('link-external');
            this.command = {
                command: 'karateRunHistory.openReport',
                title: 'Open Report',
                arguments: [data.reportPath]
            };
            this.contextValue = 'report';
        }
    }
}

export class RunHistoryProvider implements vscode.TreeDataProvider<HistoryTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HistoryTreeItem | undefined | null | void> = new vscode.EventEmitter<HistoryTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HistoryTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string) {
        // Watch for changes in the target directory
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceRoot, 'target/karate-reports*/**/*')
        );

        watcher.onDidCreate(() => this.refresh());
        watcher.onDidChange(() => this.refresh());
        watcher.onDidDelete(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]> {
        if (!element) {
            // Root level - show date groups
            const runs = await this.loadTestRuns();
            const groups = this.groupRunsByDate(runs);
            return groups.map(group => 
                new HistoryTreeItem(
                    group.date, 
                    vscode.TreeItemCollapsibleState.Expanded,
                    'group'
                )
            );
        } else if (element.type === 'group') {
            // Group level - show runs for this date
            const runs = await this.loadTestRuns();
            const groups = this.groupRunsByDate(runs);
            const group = groups.find(g => g.date === element.label);
            if (!group) return [];

            return group.runs.map(run => 
                new HistoryTreeItem(
                    path.basename(run.feature),
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'run',
                    run
                )
            );
        } else if (element.type === 'run' && element.data) {
            // Run level - show actions
            return [
                new HistoryTreeItem(
                    'View Report',
                    vscode.TreeItemCollapsibleState.None,
                    'report',
                    element.data
                )
            ];
        }

        return [];
    }

    private async loadTestRuns(): Promise<TestRunSummary[]> {
        const targetDir = path.join(this.workspaceRoot, 'target');
        if (!fs.existsSync(targetDir)) {
            return [];
        }

        const runs: TestRunSummary[] = [];
        const reportDirs = fs.readdirSync(targetDir)
            .filter(dir => dir.startsWith('karate-reports'))
            .map(dir => path.join(targetDir, dir))
            .filter(dir => fs.existsSync(dir));

        for (const reportDir of reportDirs) {
            const summaryPath = path.join(reportDir, 'karate-summary-json.txt');
            if (!fs.existsSync(summaryPath)) {
                continue;
            }

            try {
                const content = fs.readFileSync(summaryPath, 'utf8');
                const summary = JSON.parse(content);

                let timestamp = summary.resultDate;
                const timestampMatch = reportDir.match(/karate-reports_(\d+)/);
                if (timestampMatch) {
                    const unixTimestamp = parseInt(timestampMatch[1]);
                    timestamp = new Date(unixTimestamp).toISOString();
                }

                summary.featureSummary.forEach((feature: any) => {
                    runs.push({
                        id: uuidv4(),
                        feature: feature.relativePath,
                        timestamp: timestamp,
                        duration: feature.durationMillis,
                        scenariosPassed: feature.passedCount,
                        scenariosFailed: feature.failedCount,
                        reportPath: path.join(reportDir, 'karate-summary.html')
                    });
                });
            } catch (error) {
                console.error(`Error processing summary file ${summaryPath}:`, error);
            }
        }

        return runs.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    private groupRunsByDate(runs: TestRunSummary[]): TestRunGroup[] {
        const groups: Map<string, TestRunSummary[]> = new Map();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        for (const run of runs) {
            const runDate = new Date(run.timestamp);
            let groupName: string;

            if (runDate >= today) {
                groupName = 'Today';
            } else if (runDate >= yesterday) {
                groupName = 'Yesterday';
            } else if (runDate >= lastWeek) {
                groupName = 'Last 7 days';
            } else {
                groupName = 'Older';
            }

            if (!groups.has(groupName)) {
                groups.set(groupName, []);
            }
            groups.get(groupName)!.push(run);
        }

        // Sort groups by priority
        const groupOrder = ['Today', 'Yesterday', 'Last 7 days', 'Older'];
        return groupOrder
            .filter(group => groups.has(group))
            .map(group => ({
                date: group,
                runs: groups.get(group)!
            }));
    }

    async clearHistory(): Promise<void> {
        const targetDir = path.join(this.workspaceRoot, 'target');
        if (!fs.existsSync(targetDir)) {
            return;
        }

        const reportDirs = fs.readdirSync(targetDir)
            .filter(dir => dir.startsWith('karate-reports'))
            .map(dir => path.join(targetDir, dir));

        for (const dir of reportDirs) {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }

        this.refresh();
    }
}
