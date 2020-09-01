const WebSocketServer = require('ws').Server;
const uuid = require('uuid');

class WSServer {
    constructor() {
        this.wsList = [];
    }

    send(data, socket) {
        socket.send(JSON.stringify(data));
    }

    sendToList(data, socketList) {
        socketList.forEach(s => this.send(data, s));
    }

    sendAll(data){
        this.sendToList(data, this.wsList);
    }

    init(options) {
        this.server = new WebSocketServer(options);
        this.server.on("connection", (socket, req) => {
            socket.id = uuid.v4();
            this.wsList.push(socket);
            let address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            console.log('WebSocket Connection Start:', address);
            socket.on("message", (message) => {
                let data;
                try {
                    data = JSON.parse(message);
                } catch (e) {
                    console.error('Error JSON Parsing:', message);
                }
                if (this.handler) {
                    this.handler(data, socket);
                }
            });
            socket.on("error", (error) => {
                console.error(`WebSocketError${address}: ${error}`);
                if(this.onerror){
                    this.onerror(socket, error);
                }
                socket.close();
            });
            socket.on("close", () => {
                console.error(`WebSocket Connection Close: ${address}`);
                this.wsList.splice(this.wsList.indexOf(socket), 1);
                if(this.onclose){
                    this.onclose(socket);
                }
            });
        });
    }
}

exports = module.exports = new WSServer();
