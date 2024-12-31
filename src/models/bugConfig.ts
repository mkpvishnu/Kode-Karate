export interface ResponseParser {
    statusPath: string;
    titlePath: string;
    linkPath: string;
    statusMapping: { [key: string]: string };
}

export interface BugConfig {
    apiEndpoint: string;
    headers: { [key: string]: string };
    idPattern: string;
    responseParser: ResponseParser;
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