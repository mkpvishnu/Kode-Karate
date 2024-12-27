import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';

export class JavaFinder {
    private static readonly JAVA_11_VERSION = '11';

    public static async findJava11(): Promise<string> {
        // First check if JAVA_HOME is set and points to Java 11
        const javaHome = process.env.JAVA_HOME;
        if (javaHome) {
            try {
                const version = await this.getJavaVersion(path.join(javaHome, 'bin', 'java'));
                if (version.includes(this.JAVA_11_VERSION)) {
                    return path.join(javaHome, 'bin', 'java');
                }
            } catch (error: unknown) {
                // Continue searching if JAVA_HOME doesn't point to Java 11
            }
        }

        // Check common Java installation locations based on OS
        const commonPaths = this.getCommonJavaLocations();
        for (const javaPath of commonPaths) {
            try {
                const version = await this.getJavaVersion(javaPath);
                if (version.includes(this.JAVA_11_VERSION)) {
                    return javaPath;
                }
            } catch (error: unknown) {
                continue;
            }
        }

        // If not found in common locations, try /usr/libexec/java_home on macOS
        if (process.platform === 'darwin') {
            try {
                const javaHome = child_process.execSync('/usr/libexec/java_home -v 11').toString().trim();
                const javaPath = path.join(javaHome, 'bin', 'java');
                const version = await this.getJavaVersion(javaPath);
                if (version.includes(this.JAVA_11_VERSION)) {
                    return javaPath;
                }
            } catch (error: unknown) {
                // Continue if java_home fails
            }
        }

        throw new Error('Java 11 not found. Please install Java 11 and set JAVA_HOME correctly.');
    }

    private static getCommonJavaLocations(): string[] {
        const paths: string[] = [];
        const isWindows = process.platform === 'win32';
        const isMac = process.platform === 'darwin';

        if (isWindows) {
            const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
            const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
            
            [programFiles, programFilesX86].forEach(root => {
                paths.push(
                    path.join(root, 'Java', 'jdk-11', 'bin', 'java.exe'),
                    path.join(root, 'AdoptOpenJDK', 'jdk-11', 'bin', 'java.exe'),
                    path.join(root, 'Eclipse Adoptium', 'jdk-11', 'bin', 'java.exe'),
                    path.join(root, 'Amazon Corretto', 'jdk11', 'bin', 'java.exe')
                );
            });
        } else if (isMac) {
            paths.push(
                '/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home/bin/java',
                '/Library/Java/JavaVirtualMachines/adoptopenjdk-11.jdk/Contents/Home/bin/java',
                '/Library/Java/JavaVirtualMachines/temurin-11.jdk/Contents/Home/bin/java',
                '/Library/Java/JavaVirtualMachines/amazon-corretto-11.jdk/Contents/Home/bin/java'
            );
        } else {
            // Linux paths
            paths.push(
                '/usr/lib/jvm/java-11-openjdk/bin/java',
                '/usr/lib/jvm/java-11-openjdk-amd64/bin/java',
                '/usr/java/jdk-11/bin/java',
                '/usr/lib/jvm/adoptopenjdk-11/bin/java',
                '/usr/lib/jvm/temurin-11/bin/java',
                '/usr/lib/jvm/java-11/bin/java'
            );
        }

        return paths;
    }

    private static async getJavaVersion(javaPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            child_process.exec(`"${javaPath}" -version`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                // Java outputs version to stderr
                resolve(stderr || stdout);
            });
        });
    }
}