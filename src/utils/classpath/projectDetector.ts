import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as util from 'util';

const exec = util.promisify(child_process.exec);

export class ProjectDetector {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    private isMavenProject(): boolean {
        return fs.existsSync(path.join(this.workspaceRoot, 'pom.xml'));
    }

    private isGradleProject(): boolean {
        return fs.existsSync(path.join(this.workspaceRoot, 'build.gradle')) ||
               fs.existsSync(path.join(this.workspaceRoot, 'build.gradle.kts'));
    }

    private async getMavenDependencyClasspath(): Promise<string> {
        try {
            // Run mvn dependency:build-classpath to get all dependency jars
            const { stdout } = await exec('mvn dependency:build-classpath -Dmdep.outputFile=.mvn-classpath', {
                cwd: this.workspaceRoot
            });

            // Read the generated classpath file
            const classpathFile = path.join(this.workspaceRoot, '.mvn-classpath');
            if (fs.existsSync(classpathFile)) {
                const classpath = fs.readFileSync(classpathFile, 'utf8').trim();
                // Clean up the temporary file
                fs.unlinkSync(classpathFile);
                return classpath;
            }
            return '';
        } catch (error) {
            console.error('Error getting Maven dependencies:', error);
            return '';
        }
    }

    private async findMavenTargetClasses(): Promise<string[]> {
        const targetDir = path.join(this.workspaceRoot, 'target', 'classes');
        const testTargetDir = path.join(this.workspaceRoot, 'target', 'test-classes');
        
        const paths: string[] = [];
        
        if (fs.existsSync(targetDir)) {
            paths.push(targetDir);
        }
        if (fs.existsSync(testTargetDir)) {
            paths.push(testTargetDir);
        }

        return paths;
    }

    private async findGradleBuildClasses(): Promise<string[]> {
        const buildDir = path.join(this.workspaceRoot, 'build', 'classes', 'java', 'main');
        const testBuildDir = path.join(this.workspaceRoot, 'build', 'classes', 'java', 'test');
        
        const paths: string[] = [];
        
        if (fs.existsSync(buildDir)) {
            paths.push(buildDir);
        }
        if (fs.existsSync(testBuildDir)) {
            paths.push(testBuildDir);
        }

        return paths;
    }

    public async getProjectSpecificPaths(): Promise<string[]> {
        const paths: string[] = [];

        if (this.isMavenProject()) {
            const mavenPaths = await this.findMavenTargetClasses();
            paths.push(...mavenPaths);

            // Get Maven dependency classpath
            const dependencyClasspath = await this.getMavenDependencyClasspath();
            if (dependencyClasspath) {
                paths.push(...dependencyClasspath.split(path.delimiter));
            }
        }

        if (this.isGradleProject()) {
            const gradlePaths = await this.findGradleBuildClasses();
            paths.push(...gradlePaths);
        }

        return paths.filter(p => p && fs.existsSync(p)); // Filter out non-existent paths
    }
}