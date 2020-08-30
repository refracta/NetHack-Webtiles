const {
    spawn
} = require('child_process');

const {
    UnixDgramSocket
} = require('unix-dgram-socket');


const DEFAULT_GAME_UDS_PATH = '/tmp/nethack-webtiles-game';
const DEFAULT_SERVER_UDS_PATH = '/tmp/nethack-webtiles-server';
const CLIENT_ENDPOINT_PATH = 'default';
const DEFAULT_PING_TIMEOUT = 10000;

class UDSServer {
    constructor() {
        this.serverUDSPath = DEFAULT_SERVER_UDS_PATH;
        this.gameUDSPath = DEFAULT_GAME_UDS_PATH;
        this.pingTimeout = DEFAULT_PING_TIMEOUT;
        this.debugMode = false;
        this.debugOption = {disableTimeoutDisconnect: false, disableSendFunction: false};

        this.socket = new UnixDgramSocket();
        this.connectionInfo = {};

        this.socket.on('message', (message, socketInfo) => {
            message = message.toString(UnixDgramSocket.payloadEncoding).substring(0, message.indexOf('\0'));
            let data;
            try {
                data = JSON.parse(message);
            } catch (e) {
                console.error('Error JSON Parsing:', message);
                return;
            }
            let path = socketInfo.remoteSocket;
            let info = this.connectionInfo[path];

            if (!info && data.msg === 'init_socket') {
                console.log('InitSocket:', path);
                console.log(`SendSocketConnect: ${path}`);
                info = {};
                info.socketInfo = socketInfo;
                info.path = path;
                info.pid = parseInt(path.split('-').pop());
                info.lastReceivePingTime = new Date().getTime();

                let initEndStatus = this.send({
                    msg: 'init_socket_end'
                }, info);

                if (!initEndStatus) {
                    console.error('InitEndError!');
                    return;
                }
                this.connectionInfo[path] = info;

                info.pingTimeoutCheckIntervalId = setInterval(() => {
                    if ((this.debugMode && !this.debugOption.disableTimeoutDisconnect) && new Date().getTime() - connectionInfo.lastReceivePingTime >= PING_TIMEOUT) {
                        console.error('PingTimeoutError:', `Path: ${path}`);
                        clearInterval(info.pingTimeoutCheckIntervalId);
                        clearInterval(info.sendPingIntervalId);
                        delete this.connectionInfo[path];
                    }
                }, Math.ceil(this.pingTimeout / 3));
                info.sendPingIntervalId = setInterval(() => {
                    this.send({
                        msg: 'ping'
                    }, info);
                }, Math.ceil(this.pingTimeout / 3));
            } else if (info) {
                if (data.msg === 'ping') {
                    console.log(`Ping from ${path}`);
                    info.lastReceivePingTime = new Date().getTime();
                    this.send({
                        msg: 'pong'
                    }, info);
                } else if (data.msg === 'pong') {
                    console.log(`Pong from ${path}`);
                } else {
                    if (this.handler) {
                        this.handler(data, info);
                    }
                }
            }
        });

        this.socket.on('error', (error) => {
            console.log('UDSSocketError:\n', error);
        });

        this.socket.on('listening', (path) => {
            console.log(`UDSSocketListening: ${path}`);
        });
    }

    getServerUDSPath() {
        return `${this.serverUDSPath}-${CLIENT_ENDPOINT_PATH}`;
    }

    getClientPath(pid) {
        return `${this.gameUDSPath}-${pid}`;
    }

    // pathInfo = info Object or path String
    send(data, pathInfo) {
        if (this.debugMode && this.debugOption.disableSendFunction) {
            return true;
        }
        if (typeof pathInfo === "object") {
            pathInfo = pathInfo.path;
        }
        if (!this.socket.send(JSON.stringify(data) + '\0', pathInfo)) {
            console.error(`UDSSocketSendError(${pathInfo}): ${JSON.stringify(data)}`);
            let info = this.connectionInfo[pathInfo];
            if (info) {
                clearInterval(info.pingTimeoutCheckIntervalId);
                clearInterval(info.sendPingIntervalId);
                delete this.connectionInfo[pathInfo];
            }
            return false;
        }
        return true;
    }

    sendToList(data, pathInfoList) {
        pathInfoList.forEach(i => {
            this.send(data, i)
        });
    }

    sendAll(data) {
        this.sendToList(data, Object.values(this.connectionInfo));
    }

    init() {
        this.socket.bind(this.getServerUDSPath());
    }
}

/*
function handleCore(data, path) {
    switch (data.msg) {
        case 'debug':
            console.log('DebugMsg:', data);
            break;
        case 'putstr':
        case 'update_tile':
        case 'status_update':
            console.log(data);
            wsList.forEach(e => e.send(JSON.stringify(data)));
            //io.emit('data', data);
            break;
        case 'functionCall':
            delete data.msg;
            var funcString = data.functionMain.split('(').shift() + '(' + data.paramLine.map(e => e.replace(';', '')).join(', ') + ')';
            console.log(`FunctionCall(${new Date().getTime()}): ${funcString}`);
            break;
        case 'functionEnd':
            delete data.msg;
            var funcString = data.functionMain.split('(').shift() + '(' + data.paramLine.map(e => e.replace(';', '')).join(', ') + ')';
            console.log(`FunctionEnd(${new Date().getTime()}): ${funcString}`);
            break;
        default:
            console.log('Unknown Request!');
            console.log(`path: ${path}`, data);
            break;
    }
}


 */

exports = module.exports = new UDSServer();
