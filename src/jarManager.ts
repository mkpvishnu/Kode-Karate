import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export class KarateJarManager {
    private static readonly KARATE_VERSION = '1.4.0';
    private static readonly KARATE_URL = 'https://github.com/karatelabs/karate/releases/download/v1.4.0/karate-1.4.0.jar';
    private static readonly RETRY_COUNT = 3;
    private static readonly RETRY_DELAY = 2000;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly output: vscode.OutputChannel
    ) {}

    public async ensureJar(): Promise<string> {
        const jarPath = path.join(this.context.globalStorageUri.fsPath, `karate-${KarateJarManager.KARATE_VERSION}-all.jar`);
        
        if (await this.isValidJar(jarPath)) {
            this.output.appendLine('Karate standalone JAR already exists and is valid.');
            return jarPath;
        }

        this.output.appendLine(`Downloading Karate ${KarateJarManager.KARATE_VERSION} standalone...`);
        
        for (let attempt = 1; attempt <= KarateJarManager.RETRY_COUNT; attempt++) {
            try {
                this.output.appendLine(`Download attempt ${attempt}...`);
                await this.downloadJar(KarateJarManager.KARATE_URL, jarPath);
                
                if (await this.isValidJar(jarPath)) {
                    this.output.appendLine('Karate standalone JAR downloaded and verified successfully.');
                    return jarPath;
                }
                throw new Error('JAR verification failed');
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                this.output.appendLine(`Attempt ${attempt} failed: ${errorMessage}`);
                if (fs.existsSync(jarPath)) {
                    fs.unlinkSync(jarPath);
                }
                if (attempt === KarateJarManager.RETRY_COUNT) {
                    throw new Error(`Failed to download Karate JAR after ${KarateJarManager.RETRY_COUNT} attempts`);
                }
                await new Promise(resolve => setTimeout(resolve, KarateJarManager.RETRY_DELAY));
            }
        }

        throw new Error('Failed to ensure Karate JAR');
    }

    private async isValidJar(jarPath: string): Promise<boolean> {
        if (!fs.existsSync(jarPath)) {
            return false;
        }

        try {
            // Check if it's a valid JAR file
            const buffer = Buffer.alloc(4);
            const fd = fs.openSync(jarPath, 'r');
            fs.readSync(fd, buffer, 0, 4, 0);
            fs.closeSync(fd);

            // ZIP magic number
            return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
        } catch (error) {
            return false;
        }
    }

    private async downloadJar(url: string, jarPath: string): Promise<void> {
        const directory = path.dirname(jarPath);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        return new Promise<void>((resolve, reject) => {
            const tempPath = `${jarPath}.tmp`;
            const file = fs.createWriteStream(tempPath);
            
            const request = https.get(url, {
                headers: {
                    'User-Agent': 'VSCode-Karate-Extension/1.0',
                    'Accept': 'application/octet-stream'
                }
            }, (response) => {
                // Handle redirects
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const redirectUrl = response.headers.location;
                    if (!redirectUrl) {
                        reject(new Error('Redirect URL not found'));
                        return;
                    }
                    file.close();
                    fs.unlinkSync(tempPath);
                    this.downloadJar(redirectUrl, jarPath).then(resolve).catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(tempPath);
                    reject(new Error(`Failed to download JAR: HTTP ${response.statusCode}`));
                    return;
                }

                const total = parseInt(response.headers['content-length'] || '0', 10);
                let current = 0;

                response.on('data', (chunk: Buffer) => {
                    current += chunk.length;
                    const percentage = total ? Math.round((current / total) * 100) : 0;
                    this.output.appendLine(`Download progress: ${percentage}%`);
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    // Rename temp file to final file
                    fs.renameSync(tempPath, jarPath);
                    resolve();
                });
            });

            request.on('error', (err: Error) => {
                file.close();
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                reject(err);
            });

            request.setTimeout(30000, () => {
                request.destroy();
                file.close();
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                reject(new Error('Download timeout'));
            });
        });
    }
}