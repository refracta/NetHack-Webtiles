const WebSocketServer = require('ws').Server;
const uuid = require('uuid');

class WSServer {
    constructor() {
        this.connectionInfoMap = {};
    }

    send(data, socketInfo) {
        if(socketInfo.send){
            socket.send(JSON.stringify(data));
        }else{
            socketInfo.socket.send(JSON.stringify(data));
        }
    }

    sendToList(data, socketInfoList) {
        socketInfoList.forEach(s => this.send(data, s));
    }

    sendAll(data){
        this.sendToList(data, Object.values(this.connectionInfoMap));
    }

    init(options) {
        this.server = new WebSocketServer(options);
        this.server.on("connection", (socket, req) => {
            socket.id = uuid.v4();
            let info = {};
            info.socket = socket;
            info.req = req;
            this.connectionInfoMap[socket.id] = info;

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
                    try{
                        this.handler(data, info);
                    }catch(e){
                        console.error('WSHandling Error!');
                        console.error(e);
                        console.error(data);
                    }
                }
            });
            socket.on("error", (error) => {
                console.error(`WebSocketError${address}: ${error}`);
                if(this.errorHandler){
                    info.error = error;
                    this.errorHandler(info);
                }
                socket.close();
            });
            socket.on("close", () => {
                console.error(`WebSocket Connection Close: ${address}`);
                delete this.connectionInfoMap[info.socket.id];
                if(this.closeHandler){
                    this.closeHandler(info);
                }
            });
        });
    }
}

exports = module.exports = new WSServer();
