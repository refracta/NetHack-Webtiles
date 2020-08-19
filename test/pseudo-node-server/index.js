const fs = require("fs");
const express = require("express");
const app = express();
const http = require("http");
const httpServer = http.createServer(app);
const io = require("socket.io")(httpServer);
const process = require('process');
const port = process.env.PORT || 80;

const {
    spawn
} = require('child_process');

const {
    UnixDgramSocket
} = require('unix-dgram-socket');
// https://stackoverflow.com/questions/52807556/process-argv-is-undefined-in-node-js
const socket = new UnixDgramSocket();

var DEFAULT_SERVER_PATH = '/tmp/nethack-webtiles-server';
var DEFAULT_CLIENT_PATH = '/tmp/nethack-webtiles-client';
var DEFAULT_NETHACK_PATH = '/nh/install/games/nethack';
var argv = process.argv.slice(2);
if (argv.length > 0) {
    DEFAULT_NETHACK_PATH = argv.join(' ');
}

const SERVER_PATH = (pid) => `${DEFAULT_SERVER_PATH}-${pid}`;
const CLIENT_PATH = () => `${DEFAULT_CLIENT_PATH}-default`;
const CONNECTION_INFO = {};

const PING_TIMEOUT = 10000;

function handleCore(path, obj) {
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

socket.on('error', (error) => {
    console.log('MainSocketError:\n', error);
});

function send(data, path) {
    if (!socket.send(JSON.stringify(data) + '\0', path)) {
        console.log(`SocketSendError(${path}): ${JSON.stringify(data)}\n`);
        var connectionInfo = CONNECTION_INFO[path];
        clearInterval(connectionInfo.pingTimeoutCheckIntervalId);
        clearInterval(connectionInfo.sendPingIntervalId);
        delete CONNECTION_INFO[path];
    }
}

socket.on('message', (message, info) => {
    message = message.toString(UnixDgramSocket.payloadEncoding).substring(0, message.indexOf('\0'));
    let obj;
    try {
        obj = JSON.parse(message);
    } catch (e) {
        console.log('Error JSON Parsing:', message);
        return;
    }
    let path = info.remoteSocket;
    let connectionInfo = CONNECTION_INFO[path];

    if (!connectionInfo && obj.msg === 'init_socket') {
        console.log('InitSocket:', path);
        console.log(`SendSocketConnect: ${path}`);
        connectionInfo = {};
        connectionInfo.path = path;
        connectionInfo.pid = parseInt(path.split('-').pop());
        connectionInfo.lastReceivePingTime = new Date().getTime();
        CONNECTION_INFO[path] = connectionInfo;
        send({
            msg: 'init_socket_end'
        }, path);
        connectionInfo.pingTimeoutCheckIntervalId = setInterval(() => {
            if (new Date().getTime() - connectionInfo.lastReceivePingTime >= PING_TIMEOUT) {
                console.error('PingTimeoutError:', `Path: ${path}`);
                clearInterval(connectionInfo.pingTimeoutCheckIntervalId);
                clearInterval(connectionInfo.sendPingIntervalId);
                delete CONNECTION_INFO[path];
            }
        }, Math.ceil(PING_TIMEOUT / 3));
        connectionInfo.sendPingIntervalId = setInterval(() => {
            send({
                msg: 'ping'
            }, path);
        }, Math.ceil(PING_TIMEOUT / 3));
    } else if (connectionInfo && obj.msg === 'ping') {
        console.log(`Ping from ${path}`);
        connectionInfo.lastReceivePingTime = new Date().getTime();
        send({
            msg: 'pong'
        }, path);
    } else if (connectionInfo && obj.msg === 'pong') {
        console.log(`Pong from ${path}`);
    } else if (connectionInfo) {
        handleCore(path, obj);
    }
});

socket.on('listening', (path) => {
    console.log(`MainSocketListening: ${path}`);
});

socket.bind(CLIENT_PATH());

/*
for (var i = 0; i < 20; i++) {
var runProcess = spawn(DEFAULT_NETHACK_PATH);
console.log('Run Process! PID:', runProcess.pid);
}
 */

io.on('connection', (socket) => {
    // console.log(socket);
    socket.on('connection', (data) => {
        if (data.msg == 'key') {
            console.log(data);
            Object.keys(CONNECTION_INFO).forEach(path => {
                send(data, path);
            });
        }
    });
});

app.get("/*", (req, res, next) => {
    express.static('web')(req, res, next);
});

httpServer.listen(port, function () {
    console.log("Listening on port *:" + port);
});
