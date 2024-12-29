import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

interface Scenario {
    name: string;
    line: number;
}

interface Feature {
    path: string;
    name: string;
    scenarios: Scenario[];
}

export class FeatureTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'folder' | 'feature' | 'scenario',
        public readonly featurePath?: string,
        public readonly scenarioLine?: number
    ) {
        super(label, collapsibleState);

        switch (type) {
            case 'folder':
                this.iconPath = new vscode.ThemeIcon('folder');
                this.contextValue = 'folder';
                break;
            case 'feature':
                this.iconPath = new vscode.ThemeIcon('file');
                this.contextValue = 'feature';
                if (featurePath) {
                    this.command = {
                        command: 'vscode.open',
                        arguments: [vscode.Uri.file(featurePath)],
                        title: 'Open Feature'
                    };
                }
                break;
            case 'scenario':
                this.iconPath = new vscode.ThemeIcon('symbol-event');
                this.contextValue = 'scenario';
                if (featurePath) {
                    this.description = `Line ${scenarioLine}`;
                }
                break;
        }
    }
}

export class FeatureTreeProvider implements vscode.TreeDataProvider<FeatureTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FeatureTreeItem | undefined | null | void> = new vscode.EventEmitter<FeatureTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FeatureTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string, private runCallback: (filePath: string, scenarioName?: string) => Promise<void>) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FeatureTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FeatureTreeItem): Promise<FeatureTreeItem[]> {
        if (!element) {
            // Root level - show folders
            const features = await this.findFeatureFiles();
            const folderMap = this.groupFeaturesByFolder(features);
            return this.createFolderItems(folderMap);
        } else if (element.type === 'folder') {
            // Folder level - show features
            const features = await this.getFeaturesInFolder(element.label);
            return features.map(feature => new FeatureTreeItem(
                path.basename(feature.path),
                vscode.TreeItemCollapsibleState.Collapsed,
                'feature',
                feature.path
            ));
        } else if (element.type === 'feature' && element.featurePath) {
            // Feature level - show scenarios
            const scenarios = await this.getScenarios(element.featurePath);
            return scenarios.map(scenario => new FeatureTreeItem(
                scenario.name,
                vscode.TreeItemCollapsibleState.None,
                'scenario',
                element.featurePath,
                scenario.line
            ));
        }
        return [];
    }

    private async findFeatureFiles(): Promise<string[]> {
        const pattern = new vscode.RelativePattern(this.workspaceRoot, '**/*.feature');
        const files = await vscode.workspace.findFiles(pattern);
        return files.map(file => file.fsPath);
    }

    private groupFeaturesByFolder(features: string[]): Map<string, string[]> {
        const folderMap = new Map<string, string[]>();
        
        for (const feature of features) {
            const relativePath = path.relative(this.workspaceRoot, feature);
            const folderPath = path.dirname(relativePath);
            
            if (!folderMap.has(folderPath)) {
                folderMap.set(folderPath, []);
            }
            folderMap.get(folderPath)!.push(feature);
        }

        return folderMap;
    }

    private createFolderItems(folderMap: Map<string, string[]>): FeatureTreeItem[] {
        return Array.from(folderMap.keys())
            .sort()
            .map(folder => new FeatureTreeItem(
                folder === '.' ? 'Root' : folder,
                vscode.TreeItemCollapsibleState.Collapsed,
                'folder'
            ));
    }

    private async getFeaturesInFolder(folderPath: string): Promise<Feature[]> {
        const allFeatures = await this.findFeatureFiles();
        const folderFeatures = allFeatures.filter(f => {
            const relativePath = path.relative(this.workspaceRoot, f);
            const featureFolder = path.dirname(relativePath);
            return featureFolder === folderPath || (folderPath === 'Root' && featureFolder === '.');
        });

        return folderFeatures.map(f => ({
            path: f,
            name: path.basename(f),
            scenarios: []
        })).sort((a, b) => a.name.localeCompare(b.name));
    }

    private async getScenarios(featurePath: string): Promise<Scenario[]> {
        const content = await fs.readFile(featurePath, 'utf-8');
        const scenarios: Scenario[] = [];
        
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
                const name = line.substring(line.indexOf(':') + 1).trim();
                scenarios.push({ name, line: i + 1 });
            }
        }

        return scenarios;
    }
}