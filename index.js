const fs = require("fs");
const express = require("express");
const app = express();
const http = require("http");
const httpServer = http.createServer(app);
// const io = require("socket.io")(httpServer);
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({server: httpServer, path: "/"});
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
// PING_TIMEOUT = PING_TIMEOUT * PING_TIMEOUT;
const DISABLE_TIMEOUT_DISCONNECT = true;
const DISABLE_SEND_FUNCTION = false;

function handleCore(path, obj) {
    switch (obj.msg) {
	case 'debug':
        console.log('DebugMsg:', obj);
        break;
    case 'putstr':
	case 'update_tile':
		console.log(obj);
        wsArr.forEach(e=>e.send(JSON.stringify(obj)));
		//io.emit('data', obj);
        break;
	case 'functionCall':
		delete obj.msg;
		var funcString = obj.functionMain.split('(').shift() + '(' + obj.paramLine.map(e=>e.replace(';', '')).join(', ') + ')';
        console.log(`FunctionCall(${new Date().getTime()}): ${funcString}`);
        break;
	case 'functionEnd':
		delete obj.msg;
		var funcString = obj.functionMain.split('(').shift() + '(' + obj.paramLine.map(e=>e.replace(';', '')).join(', ') + ')';
        console.log(`FunctionEnd(${new Date().getTime()}): ${funcString}`);
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
	if(DISABLE_SEND_FUNCTION){
		return true;
	}
    if (!socket.send(JSON.stringify(data) + '\0', path)) {
        console.log(`SocketSendError(${path}): ${JSON.stringify(data)}\n`);
        var connectionInfo = CONNECTION_INFO[path];
		if(connectionInfo){
			clearInterval(connectionInfo.pingTimeoutCheckIntervalId);
			clearInterval(connectionInfo.sendPingIntervalId);
			delete CONNECTION_INFO[path];
		}
		return false;
    }
	return true;
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
		
		let initEndStatus = send({
            msg: 'init_socket_end'
        }, path);
		
		if(!initEndStatus){
			console.error('InitEndError!');
			return;
		}
        CONNECTION_INFO[path] = connectionInfo;
        
        connectionInfo.pingTimeoutCheckIntervalId = setInterval(() => {
            if (!DISABLE_TIMEOUT_DISCONNECT && new Date().getTime() - connectionInfo.lastReceivePingTime >= PING_TIMEOUT) {
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

function runProcess() {
    var os = require('os');
    var pty = require('node-pty');

    //var shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    var ptyProcess = pty.spawn(DEFAULT_NETHACK_PATH, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
    });
}

var wsArr = [];
wss.on("connection", function(ws) {
    wsArr.push(ws);
    ws.on("message", function(message) {
        var data = JSON.parse(message);
        if(data.keyCode == 17){
            runProcess();
            //var runProcess = spawn(DEFAULT_NETHACK_PATH);
        }
        console.log(data);
        Object.keys(CONNECTION_INFO).forEach(path => {
            send(data, path);
        });
    });
});



app.get("/*", (req, res, next) => {
    express.static('web')(req, res, next);
});

httpServer.listen(port, function () {
    console.log("Listening on port *:" + port);
});
