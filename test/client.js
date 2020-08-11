const {
    spawn
} = require('child_process');

const {
    UnixDgramSocket
} = require('unix-dgram-socket');
const mainSocket = new UnixDgramSocket();

var DEFAULT_SERVER_PATH = '/tmp/nethack-webtiles-server';
var DEFAULT_CLIENT_PATH = '/tmp/nethack-webtiles-client';
var DEFAULT_NETHACK_PATH = '/nh/install/games/nethack';
DEFAULT_NETHACK_PATH = '/root/nh/install/games/example';

const SERVER_PATH = (pid) => `${DEFAULT_SERVER_PATH}-${pid}`;
const CLIENT_PATH = () => `${DEFAULT_CLIENT_PATH}-default`;
const SOCKET_MAP = {};

const PING_TIMEOUT = 30000;

function handleCore(socket, path, obj) {
    switch (obj.msg) {
    case 'debug':

    default:
        console.log('Unknown Request!');
        console.log(`PID: ${pid}`, obj);
        break;
    }
}

mainSocket.on('error', (error) => {
    console.log('MainSocketError:\n', error);
});

mainSocket.on('message', (message, info) => {
    message = message.toString(UnixDgramSocket.payloadEncoding).substring(0, message.indexOf('\0'));
    let obj = JSON.parse(message);
    let pid = info.remoteSocket.split('-').pop();
    let path = info.path;
    let socket = SOCKET_MAP[pid];

    if (!socket && obj.msg === 'init_socket') {
        console.log('InitSocket');
        let sendSocket = new UnixDgramSocket();
        let pingTimeoutCheckIntervalId;
        let sendPingIntervalId;
        let lastReceivePingTime;
        sendSocket.on('error', (error) => {
            console.error('SendSocketError:', `PID: ${pid}\n`, error);
            sendSocket.close();
            clearInterval(pingTimeoutCheckIntervalId);
            clearInterval(sendPingIntervalId);
        });
        sendSocket.on('connect', (path) => {
            console.log(`SendSocketConnect: ${path}`);
            lastReceivePingTime = new Date().getTime();
            sendSocket.send(JSON.stringify({
                    msg: 'init_socket_end',
                }) + '\0', path);
            pingTimeoutCheckIntervalId = setInterval(() => {
                if (lastReceivePingTime - new Date().getTime() >= PING_TIMEOUT) {
                    console.error('PingTimeoutError:', `PID: ${pid}\n`, error);
                    sendSocket.close();
                    clearInterval(pingTimeoutCheckIntervalId);
                    clearInterval(sendPingIntervalId);
                }
            }, Math.floor(PING_TIMEOUT / 3));
            sendPingIntervalId = setInterval(() => {
                sendSocket.send(JSON.stringify({
                        msg: 'ping',
                    }) + '\0', path);
            }, Math.floor(PING_TIMEOUT / 3));
        });
        sendSocket.connect(SERVER_PATH(obj.pid));
        SOCKET_MAP[pid] = sendSocket;
    } else if (obj.msg === 'ping') {
        lastReceivePingTime = new Date().getTime();
        socket.send(JSON.stringify({
                msg: 'pong',
            }) + '\0', path);
    } else if (obj.msg === 'pong') {}
    else if (socket) {
        handleCore(socket, obj, path);
    }
});

mainSocket.on('listening', (path) => {
    console.log(`MainSocketListening: ${path}`);
});

mainSocket.bind(CLIENT_PATH());

//var process = spawn(DEFAULT_NETHACK_PATH);
//console.log('ProcessAPI PID:', process.pid);
