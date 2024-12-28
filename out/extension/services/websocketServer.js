"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const WebSocket = require("ws");
const events_1 = require("events");
class WebSocketServer extends events_1.EventEmitter {
    constructor(port = 0) {
        super();
        this.clients = new Set();
        this.wss = new WebSocket.Server({ port });
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.emit('message', data);
                }
                catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });
            ws.on('close', () => {
                this.clients.delete(ws);
            });
        });
    }
    broadcast(update) {
        const message = JSON.stringify(update);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
    getPort() {
        const address = this.wss.address();
        if (typeof address === 'string') {
            return parseInt(address.split(':')[1]);
        }
        return address.port;
    }
    dispose() {
        this.wss.close();
    }
}
exports.WebSocketServer = WebSocketServer;
//# sourceMappingURL=websocketServer.js.map