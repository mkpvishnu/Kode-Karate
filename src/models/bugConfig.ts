export interface BugConfig {
    apiEndpoint: string;
    headers: { [key: string]: string };
    idPattern: string;
    method: 'GET' | 'POST';
    payload?: string;
}

export interface BugStatus {
    id: string;
    status: string;
    title?: string;
    link?: string;
    error?: string;
}

export interface BugInfo {
    id: string;
    filePath: string;
    lineNumber: number;
    scenarioName: string;
    status?: BugStatus;
}