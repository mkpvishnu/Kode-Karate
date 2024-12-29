import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectDetector } from './projectDetector';

export class ClasspathManager {
    private workspaceRoot: string;
    private classpathCache: Map<string, string[]> = new Map();
    private projectDetector: ProjectDetector;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.projectDetector = new ProjectDetector(workspaceRoot);
    }

    private async findSourceDirectories(): Promise<string[]> {
        const sourceDirs = [];
        const possibleDirs = [
            'src/main/java',
            'src/test/java',
            'src/main/resources',
            'src/test/resources'
        ];

        for (const dir of possibleDirs) {
            const fullPath = path.join(this.workspaceRoot, dir);
            if (fs.existsSync(fullPath)) {
                sourceDirs.push(fullPath);
            }
        }

        return sourceDirs;
    }

    private async findFeatureDirectories(): Promise<string[]> {
        const featureDirs = new Set<string>();
        
        // Find all .feature files in the workspace
        const featureFiles = await vscode.workspace.findFiles(
            '**/*.feature',
            '**/node_modules/**'
        );

        // Add their parent directories
        for (const file of featureFiles) {
            const dirPath = path.dirname(file.fsPath);
            featureDirs.add(dirPath);
        }

        return Array.from(featureDirs);
    }

    public async buildClasspath(): Promise<string[]> {
        // Check cache first
        const cached = this.classpathCache.get(this.workspaceRoot);
        if (cached) {
            return cached;
        }

        const classpath: string[] = [];

        // Add source directories
        const sourceDirs = await this.findSourceDirectories();
        classpath.push(...sourceDirs);

        // Add feature directories
        const featureDirs = await this.findFeatureDirectories();
        classpath.push(...featureDirs);

        // Add project-specific paths (Maven/Gradle)
        const projectPaths = await this.projectDetector.getProjectSpecificPaths();
        classpath.push(...projectPaths);

        // Cache the result
        this.classpathCache.set(this.workspaceRoot, classpath);

        return classpath;
    }

    public getClasspathString(): Promise<string> {
        return this.buildClasspath().then(paths => paths.join(path.delimiter));
    }

    public clearCache(): void {
        this.classpathCache.clear();
    }
}
