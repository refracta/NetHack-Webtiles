const fs = require('fs');
const path = require('path');
const process = require('process');
const pty = require('node-pty')
const crypto = require('crypto');
const games = JSON.parse(fs.readFileSync('./games.json', 'utf8'));

/* Init Games Dir */
function mkDirByPathSync(targetDir, { isRelativeToScript = false } = {}) {
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

uds.handler = function udsHandler(data, info) {
    switch (data.msg) {
        case 'debug':
            console.log('DebugMsg:', data);
            break;
        case 'putstr':
        case 'update_tile':
        case 'status_update':
            console.log(data);
            ws.sendAll(data);
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

function getUserGameConfig(gameInfo, sessionInfo) {
    if (typeof sessionInfo === 'string') {
        // if info is sessionKey
        sessionInfo = sessions[sessionInfo];
    }
    let rcPath = gameInfo.rcPath + sessionInfo.username + '.nethackrc';
    let ttyrecPath = gameInfo.ttyrecPath + sessionInfo.username + '/';
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

const gameRoom = {};
const connectionInfo = {};
// TODO 지정 시간마다 시간 초과 세션 없애기
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
                    let socketSet = new Set();
                    socketSet.add(socket);
                    sessions[sessionKey] = {
                        time: new Date().getTime(),
                        username: data.username,
                        sessionKey,
                        socketSet
                    };
                    info.username = data.username;
                    info.sessionKey = sessionKey;
                    info.isLogin = true;
                    ws.send({
                        msg: 'login_success',
                        sessionKey,
                        username: data.username,
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
                    session.socketSet.add(socket);
                    ws.send({
                        msg: 'login_success',
                        sessionKey: session.sessionKey,
                        username: session.username,
                        games: Object.values(games).map(e => ({name: e.name, id: e.id}))
                    }, socket);
                } else {
                    // ws.send({msg: 'login_fail', reason: 'Invalid session!'}, socket);
                }
            }
            break;

        case 'chat':
            //글자 제한
            break;
        case 'get_rc':
            if (info.isLogin) {
                let gameInfo = games[data.id];
                if (gameInfo) {
                    let sessionInfo = sessions[info.sessionKey];
                    let config = getUserGameConfig(gameInfo, sessionInfo);
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
                    let config = getUserGameConfig(gameInfo, sessionInfo);
                    setRCText(config.rcPath, data.rcText);
                    ws.send({msg: 'save_rc_success'}, socket);
                }
            }
            break;
        case 'play':
            if (info.isLogin) {
                let gameInfo = games[data.id];
                if (gameInfo) {
                    // TODO 현재 플레이 중이면 해당 게임 종료 요청 보내야함
                    let sessionInfo = sessions[info.sessionKey];
                    let config = getUserGameConfig(gameInfo, sessionInfo);
                    let ptyProcess = pty.spawn('/bin/bash', [], {
                        name: 'xterm-color',
                        cols: 80,
                        rows: 30,
                        cwd: process.env.HOME,
                        env: process.env
                    });
                    ptyProcess.write(config.cmd.nethackWithTTYREC);
                    let roomInfo = gameRoom[socket.username] = {
                        id: gameInfo.id,
                        name: gameInfo.name,
                        player: socket.username,
                        playerSocket: socket,
                        startDate: new Date(),
                        watcherSocketSet: new Set()
                    };

                    info.status = 'play';
                    info.playInfo = gameInfo;
                    ws.send({msg: 'status', status: 'play'}, socket);
                    let lobbyList = ws.wsList.filter(s => connectionInfo[s.id].status === 'lobby');
                    ws.sendToList({
                        msg: 'lobby_add',
                        id: roomInfo.id,
                        name: roomInfo.name,
                        player: roomInfo.username,
                        startDate: roomInfo.startDate,
                        numberOfWatcher: roomInfo.watcherSocketSet.size
                    }, lobbyList);
                }
            }
            break;
        case 'status_change':
            if (!info.status) {

            }

            break;
    }
};

db.init();
uds.init();
web.init();
ws.init({server: web.server, path: "/"});
