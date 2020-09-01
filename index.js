const fs = require('fs');
const path = require('path');
const process = require('process');
const pty = require('node-pty')
const crypto = require('crypto');
const games = JSON.parse(fs.readFileSync('./games.json', 'utf8'));

/* Init Games Dir */
function mkDirByPathSync(targetDir, {isRelativeToScript = false} = {}) {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';

    return targetDir.split(sep).reduce((parentDir, childDir) => {
        const curDir = path.resolve(baseDir, parentDir, childDir);
        try {
            fs.mkdirSync(curDir);
        } catch (err) {
            if (err.code === 'EEXIST') { // curDir already exists!
                return curDir;
            }

            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
                throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
            }

            const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
            if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
                throw err; // Throw if it's just the last created dir.
            }
        }

        return curDir;
    }, initDir);
}


Object.values(games).forEach(g => {
    if (!fs.existsSync(g.rcPath)) {
        mkDirByPathSync(g.rcPath, {isRelativeToScript: true});
    }
    if (!fs.existsSync(g.ttyrecPath)) {
        mkDirByPathSync(g.ttyrecPath, {isRelativeToScript: true});
    }
});


const db = require('./local-db.js');
const uds = require('./uds-server.js');
const web = require('./web-server.js');
const ws = require('./ws-server.js');


const gameRoom = {};
const connectionInfo = {};

function toLobby(sockets) {
    sockets.forEach(s => connectionInfo[s.id].status = 'lobby');
    ws.sendToList({msg: 'lobby', gameList: Object.values(gameRoom).map(r => roomInfoToLobbyInfo(r))}, sockets);
}

uds.preHandler = function (data) {
    if (data.list) {
        let newList = [];
        let lastElement = data.list.reduce((a, d) => {
            if (d.msg === a.msg) {
                if (d.msg === 'tile') {
                    let i = d.i;
                    delete d.i;
                    delete d.msg;
                    return {msg: 'tile', data: {...a.data, ...{[i]: {...a.data[i], ...d}}}};
                } else if (d.msg === 'text') {
                    a.list.push(d.text);
                    return a;
                } else if (d.msg === 'status') {
                    let fldidx = d.fldidx;
                    if (d.text) {
                        d.text = d.text.trim();
                    }
                    delete d.fldidx;
                    delete d.msg;
                    return {msg: 'status', data: {...a.data, ...{[fldidx]: {...a.data[fldidx], ...d}}}};
                } else {
                    newList.push(d);
                    return d;
                }
            } else {
                if (a.msg) {
                    newList.push(a);
                }
                if (d.msg === 'tile') {
                    let i = d.i;
                    delete d.i;
                    delete d.msg;
                    return {msg: 'tile', data: {[i]: d}};
                } else if (d.msg === 'text') {
                    return {msg: 'text', list: [d.text]}
                } else if (d.msg === 'status') {
                    let fldidx = d.fldidx;
                    if (d.text) {
                        d.text = d.text.trim();
                    }
                    delete d.fldidx;
                    delete d.msg;
                    return {msg: 'status', data: {[fldidx]: d}};
                }
                return d;
            }
        }, {});
        newList.push(lastElement);
        data.list = newList;
    }
}

uds.handler = function udsHandler(data, info) {
    switch (data.msg) {
        case 'init_game':
            let roomInfo = gameRoom[data.username];
            if (roomInfo) {
                ws.send({msg: 'init_game'}, roomInfo.player);
                info.onclose = (info) => {
                    delete gameRoom[data.username];
                    let roomMembers = [roomInfo.player, ...roomInfo.watchers];
                    let lobbyList = ws.wsList.filter(s => connectionInfo[s.id].status === 'lobby');
                    ws.sendToList(roomInfoToLobbyInfo(roomInfo, 'lobby_remove'), lobbyList);
                    toLobby(roomMembers);
                    if (roomInfo.onclose) {
                        roomInfo.onclose(roomInfo);
                    }
                };
                info.room = roomInfo;
                roomInfo.udsInfo = info;
            }
            break;
        case 'debug':
            console.log('DebugMsg:', data);
            break;
        case 'tile':
            if (info.room.playData.tile) {
                info.room.playData.tile = {...info.room.playData.tile, ...data.data};
            } else {
                info.room.playData.tile = data.data;
            }
            info.room ? ws.sendToList(data, [info.room.player, ...info.room.watchers]) : void 0;
            break;
        case 'text':
            if (info.room.playData.text) {
                console.log(data);
                info.room.playData.text = [...info.room.playData.text, ...data.list].slice(-20);
            } else {
                info.room.playData.text = data.list;
            }
            info.room ? ws.sendToList(data, [info.room.player, ...info.room.watchers]) : void 0;
            break;
        case 'status':
            if (info.room.playData.status) {
                info.room.playData.status = {...info.room.playData.status, ...data.data};
            } else {
                info.room.playData.status = data.data;
            }
            info.room ? ws.sendToList(data, [info.room.player, ...info.room.watchers]) : void 0;
            break;
        case 'clear_tile':
            if (info.room.playData.tile) {
                info.room.playData.tile = {};
            }
            info.room ? ws.sendToList(data, [info.room.player, ...info.room.watchers]) : void 0;
            break;
        case 'inventory':
        case 'more':
            info.room ? ws.sendToList(data, [info.room.player, ...info.room.watchers]) : void 0;
            break;

            break;
        case 'functionCall':
        case 'functionEnd':
            console.log(`${data.msg}(${new Date().getTime()}): ${funcString}`);
            delete data.msg;
            let funcString = data.functionMain.split('(').shift() + '(' + data.paramLine.map(e => e.replace(';', '')).join(', ') + ')';
            break;
        default:
            console.log('Unknown Request!');
            console.log(`path: ${info.path}`, data);
            break;
    }
}

const sessions = {};

function getUserGameConfigWithInit(gameInfo, sessionInfo) {
    if (typeof sessionInfo === 'string') {
        // if info is sessionKey
        sessionInfo = sessions[sessionInfo];
    }
    let rcPath = gameInfo.rcPath + sessionInfo.username + '.nethackrc';
    let ttyrecPath = gameInfo.ttyrecPath + sessionInfo.username + '/';
    !fs.existsSync(ttyrecPath) ? mkDirByPathSync(ttyrecPath, {isRelativeToScript: true}) : void 0;
    ttyrecPath += new Date().toISOString() + '.ttyrec';

    let rcOptions = `NETHACKOPTIONS=@${rcPath}`;
    let nethack = `${fs.existsSync(rcPath) ? rcOptions + ' ' : ''}${gameInfo.gamePath} -u ${sessionInfo.username}`;
    let ttyrec = `ttyrec ${ttyrecPath}`;
    let nethackWithTTYREC = `${ttyrec} -e "${nethack}"\r`;
    return {rcPath, ttyrecPath, cmd: {nethack, ttyrec, nethackWithTTYREC}};
}

function getRCText(rcPath) {
    return fs.existsSync(rcPath) ? fs.readFileSync(rcPath, 'utf8') : '';
}

const MAX_RC_TEXT_LENGTH = 999999;

function setRCText(rcPath, rcText) {
    fs.writeFileSync(rcPath, rcText.substring(0, MAX_RC_TEXT_LENGTH), 'utf8');
}


// TODO 지정 시간마다 시간 초과 세션 없애기
function roomInfoToLobbyInfo(roomInfo, msg) {
    return {
        msg,
        gameId: roomInfo.id,
        gameName: roomInfo.name,
        username: connectionInfo[roomInfo.player.id].username,
        startDate: roomInfo.startDate,
        numberOfWatcher: roomInfo.watchers.size
    };
}

ws.handler = function (data, socket) {
    let info = connectionInfo[socket.id];
    if (!info) {
        info = connectionInfo[socket.id] = {};
    }
    switch (data.msg) {
        case 'register':
            console.log('Register request:', data);
            if (db.isRegistered(data.username)) {
                ws.send({msg: 'register_fail', reason: 'User already exists!'}, socket);
                return;
            }
            let usernameValid = /^[0-9a-zA-Z]{4,15}$/.test(data.username);
            if (!usernameValid) {
                ws.send({msg: 'register_fail', reason: 'Invalid username!'}, socket);
                return;
            }
            let passwordValid = /^[^:]{4,15}$/.test(data.password);
            if (!passwordValid) {
                ws.send({msg: 'register_fail', reason: 'Invalid password!'}, socket);
                return;
            }
            db.register(data);
            ws.send({msg: 'register_success'}, socket);

            // Login Redirection
            data.msg = 'login';
            ws.handler(data, socket);
            return;
            break;
        case 'login':
            console.log('Login request:', data.sessionKey ? data.sessionKey : data.username);
            if (!data.sessionKey) {
                if (!db.isRegistered(data.username)) {
                    ws.send({msg: 'login_fail', reason: 'User not exists!'}, socket);
                    return;
                }
                if (db.isValidLogin(data.username, data.password)) {
                    let sha512 = crypto.createHash('sha512');
                    let sessionKey = sha512.update(data.username + data.password + new Date().getTime()).digest('base64');
                    let sockets = new Set();
                    sockets.add(socket);
                    sessions[sessionKey] = {
                        time: new Date().getTime(),
                        username: data.username,
                        sessionKey, sockets
                    };
                    info.username = data.username;
                    info.sessionKey = sessionKey;
                    info.isLogin = true;
                    ws.send({
                        msg: 'login_success',
                        sessionKey,
                        username: data.username
                    }, socket);
                    ws.send({
                        msg: 'game_menu',
                        games: Object.values(games).map(e => ({name: e.name, id: e.id}))
                    }, socket);
                } else {
                    ws.send({msg: 'login_fail', reason: 'Username or password is invalid!'}, socket);
                }
            } else {
                let session = sessions[data.sessionKey];
                if (session) {
                    session.time = new Date().getTime();
                    info.sessionKey = data.sessionKey;
                    info.username = session.username;
                    info.isLogin = true;
                    session.sockets.add(socket);
                    ws.send({
                        msg: 'login_success',
                        sessionKey: session.sessionKey,
                        username: session.username,
                    }, socket);
                    ws.send({
                        msg: 'game_menu',
                        games: Object.values(games).map(e => ({name: e.name, id: e.id}))
                    }, socket);
                } else {
                    // ws.send({msg: 'login_fail', reason: 'Invalid session!'}, socket);
                }
            }
            break;

        case 'chat_msg':
            if (info.isLogin) {
                data.text = data.text.substring(0, 500);
                data.username = info.username;
                if (data.isPublic) {
                    ws.sendAll(data);
                } else {
                    if (info.status === 'play' && info.playRoom) {
                        let roomMembers = [info.playRoom.player, ...info.playRoom.watchers];
                        ws.sendToList(data, roomMembers);
                    } else if (info.status === 'watch' && info.watchRoom) {
                        let roomMembers = [info.watchRoom.player, ...info.watchRoom.watchers];
                        ws.sendToList(data, roomMembers);
                    }
                }
            }
            //글자 제한
            break;
        case 'get_rc':
            if (info.isLogin) {
                let gameInfo = games[data.id];
                if (gameInfo) {
                    let sessionInfo = sessions[info.sessionKey];
                    let config = getUserGameConfigWithInit(gameInfo, sessionInfo);
                    ws.send({
                        msg: 'get_rc_response',
                        rcText: getRCText(config.rcPath),
                        name: gameInfo.name,
                        id: gameInfo.id
                    }, socket);
                }
            }
            break;
        case 'save_rc':
            if (info.isLogin) {
                let gameInfo = games[data.id];
                if (gameInfo) {
                    let sessionInfo = sessions[info.sessionKey];
                    let config = getUserGameConfigWithInit(gameInfo, sessionInfo);
                    setRCText(config.rcPath, data.rcText);
                    ws.send({msg: 'save_rc_success'}, socket);
                }
            }
            break;
        case 'test':
            info.status = 'test';
            break;
        case 'play':
            if (info.isLogin) {
                let gameInfo = games[data.id];
                if (gameInfo) {
                    let prevRoomInfo = gameRoom[info.username];
                    if (!info.forcePlayHandle) {
                        info.status = 'play';
                        info.playGameInfo = gameInfo;
                        ws.send({msg: 'play', id: gameInfo.id, name: gameInfo.name}, socket);
                        let tilePath = `/tileset/${gameInfo.id}/`;
                        ws.send({
                            msg: 'set_tile',
                            dataPath: tilePath + 'default.json',
                            filePath: tilePath + 'default.png'
                        }, socket);
                    } else {
                        info.forcePlayHandle = false;
                    }

                    if (prevRoomInfo) {
                        info.forcePlayHandle = true;
                        prevRoomInfo.onclose = (roomInfo) => {
                            ws.handler(data, socket);
                        }
                        uds.send({msg: 'close'}, prevRoomInfo.udsInfo);
                        ws.send({msg: 'game_close_wait'}, socket);
                        return;
                    }
                    // TODO 현재 플레이 중이면 해당 게임 종료 요청 보내야함
                    let sessionInfo = sessions[info.sessionKey];
                    let config = getUserGameConfigWithInit(gameInfo, sessionInfo);
                    let ptyProcess = pty.spawn('/bin/bash', [], {
                        name: 'xterm-color',
                        cols: 80,
                        rows: 30,
                        cwd: process.env.HOME,
                        env: process.env
                    });
                    ptyProcess.write(config.cmd.nethackWithTTYREC);
                    console.log(config.cmd.nethackWithTTYREC);
                    let roomInfo = gameRoom[info.username] = {
                        id: gameInfo.id,
                        name: gameInfo.name,
                        player: socket,
                        startDate: new Date(),
                        watchers: new Set(),
                        playData: {},
                        gameInfo
                    };
                    info.playRoom = roomInfo;
                    let lobbyList = ws.wsList.filter(s => connectionInfo[s.id].status === 'lobby');
                    ws.sendToList(roomInfoToLobbyInfo(roomInfo, 'lobby_add'), lobbyList);
                }
            }
            break;
        case 'lobby':
            toLobby([socket]);
            break;
        case 'watch':
            if (gameRoom[data.username]) {
                let gameInfo = gameRoom[data.username].gameInfo;
                info.status = 'watch';
                info.watchRoom = gameRoom[data.username];
                ws.send({msg: 'watch', username: data.username}, socket);
                let tilePath = `/tileset/${gameInfo.id}/`;
                ws.send({
                    msg: 'set_tile',
                    dataPath: tilePath + 'default.json',
                    filePath: tilePath + 'default.png'
                }, socket);
                ws.send({msg: 'init_watch', playData: gameRoom[data.username].playData}, socket);
                gameRoom[data.username].watchers.add(socket);
            }
            break;
        case 'status_change_request':
            if (data.status === 'play') {
                if (!gameRoom[info.username]) {
                    ws.send({msg: 'status_change', status: 'play', username: data.username}, socket);
                }
            } else if (data.status === 'watch') {
                if (gameRoom[data.username]) {
                    gameRoom[data.username].watchers.add(socket);
                    ws.send({msg: 'status_change', status: 'watch', username: data.username}, socket);
                }
            } else if (data.status === 'lobby') {
                // 현재 게임 정보 전송
                toLobby([socket]);
            }
            if (!info.status) {

            }
            break;
    }

    if (data.msg === 'key') {
        console.log(data);
        if (data.keyCode == 3) {
            console.log('Okay Close Message');
            uds.sendAll({msg: 'close'});
        } else {
            uds.sendAll(data);
        }

    }
};

ws.onclose = (socket) => {
    let info = connectionInfo[socket.id];
    if (info.status === 'play') {
        let roomInfo = gameRoom[info.username];
        uds.send({msg: 'close'}, roomInfo.udsInfo);
    }
}


db.init();
uds.init();
web.init();
ws.init({
    server: web.server, path: "/",
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed.
    }
});
