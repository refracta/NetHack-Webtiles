const UnixDgramSocket = require('unix-dgram-socket').UnixDgramSocket;
const socket = new UnixDgramSocket();


// Call on error
socket.on('error', (error) => {
    console.log(error);
});

// Call when new message is received
socket.on('message', (message, info) => {
    console.log(message.toString(UnixDgramSocket.payloadEncoding));
    console.log(info);
});

// Call on successful connect
socket.on('connect', (path) => {
    console.log(`socket connected to path: ${path}`);
});

// Call when socket is bind to path
socket.on('listening', (path) => {
    console.log(`socket listening on path: ${path}`);
});

//socket.send("Special inter-process delivery!", "/tmp/socket1.sock");

// Dgram socket is connection-less so call connect only set default destination path and can be called many times
socket.bind("/tmp/client_bind");
socket.connect("/tmp/test_udp");

// Send can be called without path if 'connect' was called before
socket.send("ping");

// CLose socket to prevent further communication
//socket.close();

//socket.bind("/tmp/client_bind");
