const fs = require('fs');
const path = require('path');
const pty = require('node-pty');
const crypto = require('crypto');
const process = require('process');
const Utils = require('./utils.js');

window = {};
const Terminal = require('xterm').Terminal;
const SerializeAddon = require('xterm-addon-serialize').SerializeAddon;


class WSHandler {
    constructor(server) {
        this.server = server;
        this.callback = {};
        this.gameRoomMap = {};
        this.sessions = {};
        this.callback['key'] = (data, info) => {
            if (!info.isLogin) {
                return;
            }
            let roomInfo = this.getGameRoomByUsername(info.username);
            if (roomInfo) {
                if (data.keyCode == 3) {
                    console.log('Okay Close Message');
                    this.udsSender.close([roomInfo.udsInfo]);
                } else {
                    this.udsSender.data(data, [roomInfo.udsInfo]);
                }
            }
        }
        this.callback['register'] = (data, info) => {
            console.log('Register request:', data);
            if (this.db.isRegistered(data.username)) {
                this.sender.registerFail('User already exists!', [info]);
                return;
            }
            let usernameValid = /^[0-9a-zA-Z]{4,15}$/.test(data.username);
            if (!usernameValid) {
                this.sender.registerFail('Invalid username!', [info]);
                return;
            }
            let passwordValid = /^[^:]{4,15}$/.test(data.password);
            if (!passwordValid) {
                this.sender.registerFail('Invalid password!', [info]);
                return;
            }
            this.db.register(data);
            this.sender.registerSuccess([info]);

            // Login Redirection
            data.msg = 'login';
            this.callback['login'](data, info);
            return;
        }
        this.callback['lobby'] = (data, info) => {
            this.toLobby([info]);
        }
        this.callback['login'] = (data, info) => {
            console.log('Login request:', data.sessionKey ? data.sessionKey : data.username);
            if (!data.sessionKey) {
                if (!this.db.isRegistered(data.username)) {
                    this.sender.loginFail('User not exists!', [info]);
                    return;
                }
                if (this.db.isValidLogin(data.username, data.password)) {
                    let sha512 = crypto.createHash('sha512');
                    let sessionKey = sha512.update(data.username + data.password + new Date().getTime()).digest('base64');
                    let socketInfoSet = new Set();
                    socketInfoSet.add(info);
                    let username = this.db.getUser(data.username).username;
                    this.setSessionBySessionKey(sessionKey, {
                        time: new Date().getTime(),
                        username,
                        sessionKey, socketInfoSet
                    });
                    console.log('Login success!', username);
                    info.username = username;
                    info.sessionKey = sessionKey;
                    info.isLogin = true;
                    this.sender.loginSuccess(username, sessionKey, [info]);
                    this.sender.gameMenu(Object.values(this.games).map(e => ({name: e.name, id: e.id})), [info]);
                    this.updateLobbyWatcher();
                } else {
		    this.sender.loginFail('Username or password is invalid!', [info]);
                }
            } else {
                let session = this.getSessionBySessionKey(data.sessionKey);
                if (session) {
                    session.time = new Date().getTime();
                    info.sessionKey = data.sessionKey;
                    info.username = session.username;
                    info.isLogin = true;
                    session.socketInfoSet.add(info);
                    this.sender.loginSuccess(session.username, session.sessionKey, [info]);
                    this.sender.gameMenu(Object.values(this.games).map(e => ({name: e.name, id: e.id})), [info]);
                    this.updateLobbyWatcher();
                } else {
		    // this.sender.loginFail('Invalid session!', [info]);
                }
            }
        }

        this.callback['chat_msg'] = (data, info) => {
            if (!info.isLogin) {
                return;
            }
            data.text = data.text.substring(0, this.config.maxChatLength);
            data.username = info.username;
            if (data.isPublic) {
                this.sender.chatMsg(data.username, data.text, data.isPublic, Object.values(this.server.connectionInfoMap));
            } else {
                if (info.status === 'play' && info.playRoom) {
                    this.sender.chatMsg(data.username, data.text, data.isPublic, [info.playRoom.player, ...info.playRoom.watchers]);
                } else if (info.status === 'watch' && info.watchRoom) {
                    this.sender.chatMsg(data.username, data.text, data.isPublic, [info.watchRoom.player, ...info.watchRoom.watchers]);
                }
            }
        }

        this.callback['get_rc'] = (data, info) => {
            if (!info.isLogin) {
                return;
            }
            let gameInfo = this.getGameInfoById(data.id);
            if (gameInfo) {
                let sessionInfo = this.getSessionBySessionKey(info.sessionKey);
                let config = this.getUserGameConfigWithInit(gameInfo, sessionInfo);
                let rcText = this.getRCText(config.rcPath, config.defaultRCPath);
                this.sender.getRCResponse(gameInfo.id, gameInfo.name, rcText, [info]);
            }
        }

        this.callback['save_rc'] = (data, info) => {
            if (!info.isLogin) {
                return;
            }
            let gameInfo = this.getGameInfoById(data.id);
            if (gameInfo) {
                let sessionInfo = this.getSessionBySessionKey(info.sessionKey);
                let config = this.getUserGameConfigWithInit(gameInfo, sessionInfo);
                this.setRCText(config.rcPath, data.rcText);
                this.sender.saveRCSuccess([info]);
            }
        }
        this.callback['play'] = (data, info) => {
            if (!info.isLogin) {
                return;
            }
            let gameInfo = this.getGameInfoById(data.id);
            if (gameInfo) {
                let prevRoomInfo = this.getGameRoomByUsername(info.username);
                if (!info.forcePlayHandle) {
                    info.status = 'play';
                    info.playGameInfo = gameInfo;
                    this.sender.play(gameInfo.id, gameInfo.name, [info]);
                } else {
                    info.forcePlayHandle = false;
                }
                if (prevRoomInfo) {
                    info.forcePlayHandle = true;
                    prevRoomInfo.closeHandler = (roomInfo) => {
                        this.callback['play'](data, info);
                    }
                    this.udsSender.close([prevRoomInfo.udsInfo]);
                    this.sender.gameCloseWait([info]);
                    return;
                }
                // TODO 현재 플레이 중이면 해당 게임 종료 요청 보내야함
                let sessionInfo = this.getSessionBySessionKey(info.sessionKey);
                let config = this.getUserGameConfigWithInit(gameInfo, sessionInfo);
		let rcText = this.getRCText(config.rcPath, config.defaultRCPath);
		let webRC = this.parseWebRCData(rcText);
		this.setTileWithWebRC(`/tileset/${gameInfo.id}/`, roomInfo.webRC, info);
		    
                let ptyProcess = pty.spawn('/bin/bash', [], {
                    name: 'xterm-color',
                    cols: config.terminalCols,
                    rows: config.terminalCols,
                    cwd: process.env.HOME,
                    env: process.env
                });
                ptyProcess.write(config.cmd.nethackWithTTYREC);
                let terminal = new Terminal();
                let terminalSerializer = new SerializeAddon();
                terminal.loadAddon(terminalSerializer);
                ptyProcess.onData((data) => {
                    terminal.write(data);
                    this.sender.terminal(data, [roomInfo.player, ...roomInfo.watchers]);
                });
		ptyProcess.onExit((e) => {
		    console.log(info.username + '\'s process is closed.');
		});
                ptyProcess.write('\r');
                console.log(config.cmd.nethackWithTTYREC);
                console.log(info.username);
		
                let roomInfo = {
                    id: gameInfo.id,
                    name: gameInfo.name,
                    player: info,
                    startDate: new Date(),
                    watchers: new Set(),
                    playData: {},
                    terminalSerializer,
                    gameInfo,
		    ptyProcess,
	            webRC
                };
                this.setGameRoomByUsername(info.username, roomInfo);
                info.playRoom = roomInfo;
                let lobbyList = this.getStatusSocketInfoList('lobby');
                this.sender.lobbyAdd(roomInfo, lobbyList);
                let watcherData = this.roomToWatcherData(roomInfo);
                this.sender.updateWatcher(watcherData.userList, watcherData.numberOfWatchers, [roomInfo.player, ...roomInfo.watchers])
                setTimeout(_ => {
                    if (!roomInfo.udsInfo) {
                        this.removeGameRoomByUsername(info.username);
                        let lobbyList = this.getStatusSocketInfoList('lobby');
                        this.sender.lobbyRemove(roomInfo, lobbyList);
                        let roomMembers = [roomInfo.player, ...roomInfo.watchers];
                        this.toLobby(roomMembers);
                        if (roomInfo.closeHandler) {
                            roomInfo.closeHandler(roomInfo);
                        }
                    }
                }, 1000 * 10);
            }
        }
        this.callback['watch'] = (data, info) => {
            let roomInfo = this.getGameRoomByUsername(data.username);
            if (roomInfo) {
                let gameInfo = roomInfo.gameInfo;
                info.status = 'watch';
                info.watchRoom = roomInfo;
                roomInfo.watchers.add(info);
                this.sender.watch(data.username, [info]);
		this.setTileWithWebRC(`/tileset/${gameInfo.id}/`, roomInfo.webRC, info);
                this.sender.initWatch(roomInfo.playData, roomInfo.terminalSerializer.serialize(), roomInfo.webRC, [info]);
                let watcherData = this.roomToWatcherData(roomInfo);
                this.sender.updateWatcher(watcherData.userList, watcherData.numberOfWatchers, [roomInfo.player, ...roomInfo.watchers])
                let lobbyList = this.getStatusSocketInfoList('lobby');
                this.sender.lobbyUpdate(roomInfo, lobbyList)
            }
        }

    }
    setTileWithWebRC(defaultTilePath, webRC, info){
	    	let tileName = webRC.DEFAULT_TILE_NAME ? webRC.DEFAULT_TILE_NAME : 'default';
		let tileFilePath = webRC.CUSTOM_TILE_FILE_PATH ? webRC.CUSTOM_TILE_FILE_PATH : (defaultTilePath + tileName + '.png');
		let tileDataPath = webRC.CUSTOM_TILE_DATA_PATH ? webRC.CUSTOM_TILE_DATA_PATH : (defaultTilePath + tileName + 'default.json');
	        let tileData;
		try{
			tileData = JSON.parse(webRC.TILE_DATA);
		} catch (e){	
			
		}    
                this.sender.setTile(tileFilePath, tileDataPath, tileData, [info]);    
    }

    handle(data, info) {
        let targetCallback = this.callback[data.msg];
        if (targetCallback) {
            targetCallback(data, info);
        }
    }

    getGameRoomByUsername(username) {
        return this.gameRoomMap[username];
    }

    setGameRoomByUsername(username, data) {
        this.gameRoomMap[username] = data;
    }

    removeGameRoomByUsername(username) {
        delete this.gameRoomMap[username];
    }

    getSessionBySessionKey(sessionKey) {
        return this.sessions[sessionKey];
    }

    setSessionBySessionKey(sessionKey, data) {
        this.sessions[sessionKey] = data;
    }

    removeSessionBySessionKey(sessionKey) {
        delete this.sessions[sessionKey];
    }

    getGameInfoById(id) {
        return this.games[id];
    }


    getStatusSocketInfoList(status) {
        return Object.values(this.server.connectionInfoMap).filter(i => i.status === status);
    }

    setStatusToList(socketInfoList, status) {
        socketInfoList.forEach(i => i.status = status);
    }

    toLobby(socketInfoList) {
        this.setStatusToList(socketInfoList, 'lobby');
        this.sender.lobby(Object.values(this.gameRoomMap), socketInfoList);
        this.updateLobbyWatcher();
    }

    updateLobbyWatcher() {
        let lobbyList = this.getStatusSocketInfoList('lobby');
        let userList = [...new Set(lobbyList.filter(s => this.server.connectionInfoMap[s.socket.id].isLogin).map(s => this.server.connectionInfoMap[s.socket.id].username))];
        userList.sort();
        this.sender.updateWatcher(userList, lobbyList.length, lobbyList);
    }

    getRCText(rcPath, defaultRCPath) {
        return fs.existsSync(rcPath) ? fs.readFileSync(rcPath, 'utf8') : (fs.existsSync(defaultRCPath) ? fs.readFileSync(defaultRCPath, 'utf8') : '');
    }

    setRCText(rcPath, rcText) {
        fs.writeFileSync(rcPath, rcText.substring(0, this.config.maxRCTextLength), 'utf8');
    }

    roomToWatcherData(room) {
        let list = [...room.watchers].map(s => s.username);
        let userList = [...new Set([room.player.username, ...list.filter(e => e).sort()])];
        return {userList, numberOfWatchers: list.length};
    }

    getUserGameConfigWithInit(gameInfo, sessionInfo) {
        if (typeof sessionInfo === 'string') {
            // if info is sessionKey
            sessionInfo = this.getSessionBySessionKey(sessionInfo);
        }
        let rcPath = gameInfo.rcPath + sessionInfo.username + '.nethackrc';
        let defaultRCPath = gameInfo.rcPath + 'nethackrc';
        if (!fs.existsSync(rcPath) && fs.existsSync(defaultRCPath)) {
            fs.copyFileSync(defaultRCPath, rcPath);
        }
		let dumplogPath = gameInfo.dumplogPath + sessionInfo.username + '/';
		!fs.existsSync(dumplogPath) ? Utils.mkDirByPathSync(dumplogPath) : void 0;

        let ttyrecPath = gameInfo.ttyrecPath + sessionInfo.username + '/';
        !fs.existsSync(ttyrecPath) ? Utils.mkDirByPathSync(ttyrecPath) : void 0;
        ttyrecPath += gameInfo.id + '-' + new Date().toISOString() + '.ttyrec';

        let rcOptions = `NETHACKOPTIONS=@${rcPath}`;
        let nethack = `${fs.existsSync(rcPath) ? rcOptions + ' ' : ''}${gameInfo.gamePath} -u ${sessionInfo.username}`;
        if (sessionInfo.username === 'wizard') {
            nethack += ' -D';
        }
        let ttyrec = `ttyrec ${ttyrecPath}`;
        let nethackWithTTYREC = `${ttyrec} -e "${nethack} && exit"`;
        return {rcPath, dumplogPath, defaultRCPath, ttyrecPath, cmd: {nethack, ttyrec, nethackWithTTYREC}};
    }
	
	parseWebRCData(rcText){
		let rcData = {};
		rcText.split('\n').forEach(l => {
			l = l.trim();
			if(l.match(/^#\$.+=.+$/)){
				let s = l.split('=');
				rcData[s.shift().replace(/^#\$/, '').trim()] = s.join('=').trim();
			}
		});
		return rcData;
	}

    init(initHandle) {
        this.sender = initHandle.sender;
        this.udsHandle = initHandle.udsHandle;
        this.udsSender = initHandle.udsSender;
        this.config = initHandle.config;
        this.config = initHandle.config;
        this.games = initHandle.games;
        this.db = initHandle.db;

        this.server.handler = this.handle.bind(this);

        this.server.closeHandler = this.server.errorHandler = ((info) => {
            if (info.status === 'play') {
                let roomInfo = this.getGameRoomByUsername(info.username);
                this.udsSender.close([roomInfo.udsInfo]);
            } else if (info.status === 'watch') {
                let roomInfo = info.watchRoom;
                roomInfo.watchers.delete(info);
                let watcherData = this.roomToWatcherData(roomInfo);
                this.sender.updateWatcher(watcherData.userList, watcherData.numberOfWatchers, [roomInfo.player, ...roomInfo.watchers]);
                let lobbyList = this.getStatusSocketInfoList('lobby');
                this.sender.lobbyUpdate(roomInfo, lobbyList);
            } else if (info.status === 'lobby') {
                this.updateLobbyWatcher();
            }
        }).bind(this);

    }
}

exports = module.exports = WSHandler;
