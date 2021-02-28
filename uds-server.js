const {
    spawn
} = require('child_process');

const {
    UnixDgramSocket
} = require('./unix-dgram-socket');

const DEFAULT_GAME_UDS_PATH = '/tmp/nethack-webtiles-game';
const DEFAULT_SERVER_UDS_PATH = '/tmp/nethack-webtiles-server';
const CLIENT_ENDPOINT_PATH = 'default';
const DEFAULT_PING_TIMEOUT = 10000;
const DEFAULT_RETRY_DELAY = 100;
const DEFAULT_RETRY_LIMIT = 100;

class UDSServer {
    constructor() {
        this.serverUDSPath = DEFAULT_SERVER_UDS_PATH;
        this.gameUDSPath = DEFAULT_GAME_UDS_PATH;
        this.pingTimeout = DEFAULT_PING_TIMEOUT;
        this.debugMode = false;
        this.debugOption = {
            disableTimeoutDisconnect: false,
            disableSendFunction: false
        };

        this.socket = new UnixDgramSocket();
        this.connectionInfoMap = {};

        this.socket.on('message', (message, socketInfo) => {
            message = message.toString(UnixDgramSocket.payloadEncoding);
            message = message.substring(0, message.indexOf('\0'));;

            let path = socketInfo.remoteSocket;
            let info = this.connectionInfoMap[path];

            if(info && info.bigMsgInfo && info.bigMsgInfo.split > info.bigMsgInfo.receiveCount){
                info.bigMsgInfo.message += message;
                if(info.bigMsgInfo.split > ++info.bigMsgInfo.receiveCount){
                    return;
                }else{
                    message = info.bigMsgInfo.message;
                    delete info.bigMsgInfo;
                }
            }

            let data;
            try {
                data = JSON.parse(message);
            } catch (e) {
                console.error('Error JSON Parsing:', message.length, message);
                return;
            }



            if (!info && data.msg === 'init_socket') {
                console.log('InitSocket:', path);
                console.log(`SendSocketConnect: ${path}`);
                info = {};
                info.username = data.username;
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
                this.connectionInfoMap[path] = info;

                info.pingTimeoutCheckIntervalId = setInterval(() => {
                    if ((this.debugMode && !this.debugOption.disableTimeoutDisconnect) && new Date().getTime() - connectionInfoMap.lastReceivePingTime >= PING_TIMEOUT) {
                        console.error('PingTimeoutError:', `Path: ${path}`);
                        clearInterval(info.pingTimeoutCheckIntervalId);
                        clearInterval(info.sendPingIntervalId);
                        delete this.connectionInfoMap[path];
                    }
                }, Math.ceil(this.pingTimeout / 3));
                info.sendPingIntervalId = setInterval(() => {
                    this.send({
                        msg: 'ping'
                    }, info);
                }, Math.ceil(this.pingTimeout / 3));

                this.connectionHandle(info);
            } else if (info) {
                if (data.msg === 'ping') {
                    console.log(`Ping from ${path}`);
                    info.lastReceivePingTime = new Date().getTime();
                    this.send({
                        msg: 'pong'
                    }, info);
                } else if (data.msg === 'pong') {
                    //console.log(`Pong from ${path}`);
                } else if (data.msg === 'big_msg') {
                    info.bigMsgInfo = data;
                    info.bigMsgInfo.receiveCount = 0;
                    info.bigMsgInfo.message = '';
                } else if (data.msg === 'queued_msg') {
                    if (this.handler) {
                        data.list.forEach(d => {
                            try {
                                this.handler(d, info)
                            } catch (e) {
                                console.error('UDSHandling Error!');
                                console.error(e);
                                console.error(data);
                            }
                        });
                    }
                } else {
                    if (this.handler) {
                        this.handler(data, info);
                    }
                }
            }
        });

        this.socket.on('error', (error) => {
            if(error.errorNumber !== 11){
                console.log('UDSSocketError:\n', error);   
            }
            let info = this.connectionInfoMap[error.path];
            if (info) {
                info.error = error;
            }
        });

        this.socket.on('listening', (path) => {
            console.log(`UDSSocketListening: ${path}`);
        });
    }

    clear(info) {
        clearInterval(info.pingTimeoutCheckIntervalId);
        clearInterval(info.sendPingIntervalId);
        if (info.closeHandler) {
            info.closeHandler(info);
        }
        delete this.connectionInfoMap[info.path];
    }
    
    clearError(info) {
        info.errorCount = 0;
        delete info.error;
    }

    getServerUDSPath() {
        return `${this.serverUDSPath}-${CLIENT_ENDPOINT_PATH}`;
    }

    getClientPath(pid) {
        return `${this.gameUDSPath}-${pid}`;
    }

    // pathinfo = info Object or path String
    send(data, pathInfo) {
        if (this.debugMode && this.debugOption.disableSendFunction) {
            return true;
        }
        let path;
        if (typeof pathInfo === "object") {
            path = pathInfo.path;
        } else {
            path = pathInfo;
            pathInfo = this.connectionInfoMap[path];
        }

        if (pathInfo.deferQueue) {
            pathInfo.deferQueue.push(data);
            return true;
        }

        if (!this.socket.send(JSON.stringify(data) + '\0', path)) {
            console.error(`UDSSocketSendError(${path}): ${JSON.stringify(data)}`);
            if (pathInfo.error.errorNumber === 11) {
                // console.error(`Retry Error!`);
                pathInfo.deferQueue = [data];
                this.clearError(pathInfo);
                pathInfo.errorCount++;
                let retryInterval = setInterval(_ => {
                    if (pathInfo.errorCount > DEFAULT_RETRY_LIMIT) {
                        console.error(`Out of Retry Limit!`);
                        this.clear(pathInfo);
                        clearInterval(retryInterval);
                        return;
                    }
                    while (pathInfo.deferQueue.length > 0) {
                        let currentData = pathInfo.deferQueue.shift();
                        if (!this.socket.send(JSON.stringify(currentData) + '\0', path)) {
                            if (pathInfo.error.errorNumber === 11) {
                                // console.error(`R-Retry Error!`);
                                pathInfo.deferQueue.unshift(currentData);
                                pathInfo.errorCount++;
                            } else {
                                console.error(`R-Mode Error!`);
                                this.clear(pathInfo);
                                clearInterval(retryInterval);
                            }
                            return;
                        } else {
                            // console.log(`R-Send Success!`, pathInfo.deferQueue.length, 'left!');
                            this.clearError(pathInfo);
                        }
                    }
                    console.log(`R-Mode Finished!`);
                    delete pathInfo.deferQueue;
                    this.clearError(pathInfo);
                    clearInterval(retryInterval);
                }, DEFAULT_RETRY_DELAY);
            } else {
                this.clear(pathInfo);
            }
        } else {
            this.clearError(pathInfo);
            return true;
        }
        return false;
    }

    sendToList(data, pathInfoList) {
        pathInfoList.forEach(i => {
            this.send(data, i)
        });
    }

    sendAll(data) {
        this.sendToList(data, Object.values(this.connectionInfoMap));
    }

    init() {
        this.socket.bind(this.getServerUDSPath());
    }
}

exports = module.exports = new UDSServer();
