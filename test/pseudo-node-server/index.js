const {
    spawn
} = require('child_process');

const {
    UnixDgramSocket
} = require('unix-dgram-socket');
// https://stackoverflow.com/questions/52807556/process-argv-is-undefined-in-node-js
const process = require('process');
const mainSocket = new UnixDgramSocket();

var DEFAULT_SERVER_PATH = '/tmp/nethack-webtiles-server';
var DEFAULT_CLIENT_PATH = '/tmp/nethack-webtiles-client';
var DEFAULT_NETHACK_PATH = '/nh/install/games/nethack';
var argv = process.argv.slice(2);
if (argv.length > 0) {
    DEFAULT_NETHACK_PATH = argv.join(' ');
}

const SERVER_PATH = (pid) => `${DEFAULT_SERVER_PATH}-${pid}`;
const CLIENT_PATH = () => `${DEFAULT_CLIENT_PATH}-default`;
const SOCKET_MAP = {};

const PING_TIMEOUT = 10000;

function handleCore(socket, path, obj) {
    switch (obj.msg) {
    case 'debug':
		console.log('DebugMsg:', obj);
		break;
    default:
        console.log('Unknown Request!');
        console.log(`path: ${path}`, obj);
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
    let path = info.remoteSocket;
    let socket = SOCKET_MAP[pid];
	console.log(obj);
    if (!socket && obj.msg === 'init_socket') {
        console.log('InitSocket:', path);
        let sendSocket = new UnixDgramSocket();
        let pingTimeoutCheckIntervalId;
        let sendPingIntervalId;
        let lastReceivePingTime;
        sendSocket.on('error', (error) => {
            console.error('SendSocketError:', `PID: ${pid}\n`, error);
            sendSocket.close();
            clearInterval(pingTimeoutCheckIntervalId);
            clearInterval(sendPingIntervalId);
			delete SOCKET_MAP[pid];
        });
        sendSocket.on('connect', (path) => {
            console.log(`SendSocketConnect: ${path}`);
            lastReceivePingTime = new Date().getTime();
            sendSocket.send(JSON.stringify({
                    msg: 'init_socket_end',
                }) + '\0', path);
            pingTimeoutCheckIntervalId = setInterval(() => {
                if (new Date().getTime() - lastReceivePingTime >= PING_TIMEOUT) {
                    console.error('PingTimeoutError:', `PID: ${pid}`);
                    sendSocket.close();
                    clearInterval(pingTimeoutCheckIntervalId);
                    clearInterval(sendPingIntervalId);
					delete SOCKET_MAP[pid];
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
    } else if (socket && obj.msg === 'ping') {
        console.log(`Ping from ${path}`);
        lastReceivePingTime = new Date().getTime();
        socket.send(JSON.stringify({
                msg: 'pong',
            }) + '\0', path);
    } else if (socket && obj.msg === 'pong') {
        console.log(`Pong from ${path}`);
    } else if (socket) {
        handleCore(socket, path, obj);
    }
});

mainSocket.on('listening', (path) => {
    console.log(`MainSocketListening: ${path}`);
});

mainSocket.bind(CLIENT_PATH());

//for (var i = 0; i < 20; i++) {
//    var runProcess = spawn(DEFAULT_NETHACK_PATH);
//    console.log('Run Process! PID:', runProcess.pid);
//}
