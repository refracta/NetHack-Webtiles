class UDSHandler {
    constructor(server) {
        this.server = server;
        this.callback = {};

        this.callback['init_game'] = (data, info) => {
            let roomInfo = this.wsHandler.getGameRoomByUsername(data.username);
            if (roomInfo) {
                this.wsSender.initGame(roomInfo.webRC, [roomInfo.player]);
                info.closeHandler = (info) => {
                    this.wsHandler.removeGameRoomByUsername(data.username);
                    let roomMembersInfo = [roomInfo.player, ...roomInfo.watchers];
                    let lobbyList = this.wsHandler.getStatusSocketInfoList('lobby');
                    this.wsSender.lobbyRemove(roomInfo, lobbyList);
                    this.wsHandler.toLobby(roomMembersInfo);
                    roomInfo.ptyProcess.kill();
                    if (roomInfo.closeHandler) {
                        roomInfo.closeHandler(roomInfo);
                    }
                };
                info.room = roomInfo;
                roomInfo.udsInfo = info;
            }
        }
        this.callback['debug'] = (data, info) => {
            if(data.debug){
                try{
                    console.log('DebugMsg:', JSON.parse(data.debug));
                }catch(e){
                    console.log('DebugMsg:', data.debug);
                }
            }
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
        this.callback['clear_tile'] = (data, info) => {
            info.room ? info.room.playData.tile = {} : void 0;
            info.room ? this.wsSender.dataToRoom(data, info.room) : void 0;
        }
        this.callback['inventory'] = this.callback['more'] = (data, info) => {
            info.room ? this.wsSender.dataToRoom(data, info.room) : void 0;
        }
    }

    handle(data, info) {
        let targetCallback = this.callback[data.msg];
            if (targetCallback) {
                targetCallback(data, info);
            }
    }

    init(initHandle) {
        this.wsHandler = initHandle.wsHandler;
        this.wsSender = initHandle.wsSender;
        this.server.handler = this.handle.bind(this);
    }
}

exports = module.exports = UDSHandler;
