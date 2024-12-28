import * as WebSocket from 'ws';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export interface TestUpdate {
    type: 'start' | 'step' | 'error' | 'end';
    message: string;
    data?: any;
}

export class WebSocketServer extends EventEmitter {
    private wss: WebSocket.Server;
    private clients: Set<WebSocket> = new Set();

    constructor(port: number = 0) {
        super();
        this.wss = new WebSocket.Server({ port });

        this.wss.on('connection', (ws: WebSocket) => {
            this.clients.add(ws);

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message);
                    this.emit('message', data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
            });
        });
    }

    public broadcast(update: TestUpdate): void {
        const message = JSON.stringify(update);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    public getPort(): number {
        const address = this.wss.address();
        if (typeof address === 'string') {
            return parseInt(address.split(':')[1]);
        }
        return (address as WebSocket.AddressInfo).port;
    }

    public dispose(): void {
        this.wss.close();
    }
}