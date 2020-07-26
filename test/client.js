const {
    spawn
} = require('child_process');

const {
    UnixDgramSocket
} = require('unix-dgram-socket');
const socket = new UnixDgramSocket();

var DEFAULT_SERVER_PATH = '/tmp/nethack-webtiles-server';
var DEFAULT_CLIENT_PATH = '/tmp/nethack-webtiles-client';
var DEFAULT_NETHACK_PATH = '/nh/install/games/nethack';
DEFAULT_NETHACK_PATH = '/root/nh/install/games/example';

const SERVER_PATH = (pid) => `${DEFAULT_SERVER_PATH}-${pid}`;
const CLIENT_PATH = () => `${DEFAULT_CLIENT_PATH}-default`;

socket.on('error', (error) => {
    console.log(error);
});

socket.on('message', (message, info) => {
    message = message.toString(UnixDgramSocket.payloadEncoding);
    message = message.substring(0, message.indexOf('\0'));
    var obj = JSON.parse(message);
    switch (obj.msg) {
    case 'init_socket':
        console.log('init socket');
        console.log(obj);
        socket.connect(SERVER_PATH(obj.pid));
        break;

    default:

        break;
    }
});

socket.on('connect', (path) => {
    console.log(`SocketConnect: ${path}`);
    socket.send(JSON.stringify({
            msg: 'init_socket_end',
        }), path);
});

socket.on('listening', (path) => {
    console.log(`SocketListening: ${path}`);
});

socket.bind(CLIENT_PATH());

var process = spawn(DEFAULT_NETHACK_PATH);
console.log('ProcessAPI PID:', process.pid);
