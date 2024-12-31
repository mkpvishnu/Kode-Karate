import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { BugConfig, BugStatus } from '../models/bugConfig';

export class BugStatusService {
    private static instance: BugStatusService;
    private cache: Map<string, { status: BugStatus; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private constructor() {}

    public static getInstance(): BugStatusService {
        if (!BugStatusService.instance) {
            BugStatusService.instance = new BugStatusService();
        }
        return BugStatusService.instance;
    }

    public async getBugStatus(bugId: string, config: BugConfig): Promise<BugStatus> {
        // Check cache first
        const cached = this.cache.get(bugId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.status;
        }

        try {
            const endpoint = this.replacePlaceholders(config.apiEndpoint, bugId);
            const payload = config.payload ? this.replacePlaceholders(config.payload, bugId) : undefined;

            const response = await fetch(endpoint, {
                method: config.method,
                headers: config.headers,
                body: payload
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            const status: BugStatus = {
                id: bugId,
                status: this.extractStatus(data, config),
                title: this.extractTitle(data, config),
                link: this.extractLink(data, config)
            };

            // Update cache
            this.cache.set(bugId, { status, timestamp: Date.now() });
            return status;
        } catch (error) {
            const errorStatus: BugStatus = {
                id: bugId,
                status: 'Error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            this.cache.set(bugId, { status: errorStatus, timestamp: Date.now() });
            return errorStatus;
        }
    }

    private replacePlaceholders(template: string, bugId: string): string {
        return template.replace(/{{id}}/g, bugId);
    }

    private getValueFromPath(data: any, path: string): any {
        const parts = path.split('.');
        let value = data;
        
        for (const part of parts) {
            if (value === null || value === undefined) return undefined;
            value = value[part];
        }
        
        return value;
    }

    private extractStatus(data: any, config: BugConfig): string {
        const rawStatus = this.getValueFromPath(data, config.responseParser.statusPath);
        if (!rawStatus) return 'Unknown';

        // Apply status mapping if exists
        return config.responseParser.statusMapping[rawStatus] || rawStatus;
    }

    private extractTitle(data: any, config: BugConfig): string | undefined {
        return this.getValueFromPath(data, config.responseParser.titlePath);
    }

    private extractLink(data: any, config: BugConfig): string | undefined {
        return this.getValueFromPath(data, config.responseParser.linkPath);
    }

    public clearCache(): void {
        this.cache.clear();
    }
}
