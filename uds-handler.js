class UDSHandler {
    constructor(server) {
        this.server = server;
        this.callback = {};

        this.callback['init_game'] = (data, info) => {
            let roomInfo = this.wsHandler.getGameRoomByUsername(info.username);
            if (roomInfo) {
                this.wsSender.initGame(roomInfo.webRC, [roomInfo.player]);
                roomInfo.initGame = true;
            }
        }

        this.callback['debug'] = (data, info) => {
            if (data.debug) {
                try {
                    console.log('DebugMsg:', JSON.parse(data.debug));
                } catch (e) {
                    console.log('DebugMsg:', data.debug);
                }
            }
        }

        this.callback['error_start'] = (data, info) => {
            let safeUsername = info && info.room && info.room.player && info.room.player.username;
            console.error(`Game Error [${safeUsername}]`);
        }

        this.callback['error'] = (data, info) => {
            console.error(data.error);
        }

        this.callback['tile'] = (data, info) => {
            let tileData = info.room.playData.tile;
            info.room.playData.tile = tileData ? {...tileData, ...data.data} : data.data;
            info.room ? this.wsSender.dataToRoom(data, info.room) : void 0;
        }
        this.callback['text'] = (data, info) => {
            let textData = info.room.playData.text;
            info.room.playData.text = textData ? [...textData, ...data.list].slice(-20) : data.list;
            info.room ? this.wsSender.dataToRoom(data, info.room) : void 0;
        }
        this.callback['status'] = (data, info) => {
            let statusData = info.room.playData.status;
            info.room.playData.status = statusData ? {...info.room.playData.status, ...data.data} : data.data;
            info.room ? this.wsSender.dataToRoom(data, info.room) : void 0;
        }
        this.callback['cursor'] = (data, info) => {
            info.room.playData.cursor = data.i;
            info.room ? this.wsSender.dataToRoom(data, info.room) : void 0;
        }
        this.callback['clear_tile'] = (data, info) => {
            info.room ? info.room.playData.tile = {} : void 0;
            info.room ? this.wsSender.dataToRoom(data, info.room) : void 0;
        }

        this.callback['tty_raw_print'] = (data, info) => {
            let tty_raw_print = info.room.playData.tty_raw_print;
            info.room.playData.tty_raw_print = tty_raw_print ? [...tty_raw_print, ...data.list] : data.list;
        }

        this.callback['start_yn_function'] = this.callback['end_yn_function'] =
            this.callback['sharp_autocomplete'] = this.callback['clear_built_in_inventory'] = this.callback['built_in_menu_item'] =
                this.callback['update_menu_item'] = this.callback['close_menu_item'] = this.callback['menu_item'] =
                    this.callback['close_sharp_input'] = this.callback['start_sharp_input'] = this.callback['sharp_input'] =
                        this.callback['inventory'] = this.callback['more'] = this.callback['close_more'] = this.callback['large_text'] =
                            this.callback['close_large_text'] = (data, info) => {
                                info.room ? this.wsSender.dataToRoom(data, info.room) : void 0;
                            }
    }

    handle(data, info) {
        let targetCallback = this.callback[data.msg];
        if (targetCallback) {
            targetCallback(data, info);
        }
    }

    connectionHandle(info) {
        let username = info.username;
        let roomInfo = this.wsHandler.getGameRoomByUsername(username);
        if (roomInfo) {
            info.room = roomInfo;
            roomInfo.udsInfo = info;
            info.closeHandler = (info) => {
                this.wsHandler.removeGameRoomByUsername(username);
                let roomMembersInfo = [roomInfo.player, ...roomInfo.watchers];
                let lobbyList = this.wsHandler.getStatusSocketInfoList('lobby');
                this.wsSender.lobbyRemove(roomInfo, lobbyList);
                this.wsHandler.toLobby(roomMembersInfo);
                roomInfo.ptyProcess.kill();
                if (roomInfo.closeHandler) {
                    roomInfo.closeHandler(roomInfo);
                }
            };
        }
    }

    init(initHandle) {
        this.wsHandler = initHandle.wsHandler;
        this.wsSender = initHandle.wsSender;
        this.server.handler = this.handle.bind(this);
        this.server.connectionHandle = this.connectionHandle.bind(this);
    }
}

exports = module.exports = UDSHandler;
