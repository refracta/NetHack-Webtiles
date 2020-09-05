class WSSender {
    constructor(server) {
        this.server = server;
    }

    roomInfoToLobbyInfo(roomInfo, msg) {
        return {
            msg,
            gameId: roomInfo.id,
            gameName: roomInfo.name,
            username: roomInfo.player.username,
            startDate: roomInfo.startDate,
            numberOfWatcher: roomInfo.watchers.size
        };
    }
    gameCloseWait(socketInfoList){
        this.server.sendToList({msg: 'game_close_wait'}, socketInfoList);
    }

    lobby(roomInfoList, socketInfoList) {
        this.server.sendToList({msg: 'lobby', gameList: roomInfoList.map(r => this.roomInfoToLobbyInfo(r))}, socketInfoList);
    }
    initGame(socketInfoList) {
        this.server.sendToList({msg: 'init_game'}, socketInfoList);
    }
    updateWatcher(userList, numberOfWatchers, socketInfoList) {
        this.server.sendToList({msg: 'update_watcher', userList, numberOfWatchers}, socketInfoList);
    }

    chatMsg(username, text, isPublic, socketInfoList){
        this.server.sendToList({msg: 'chat_msg', username, text, isPublic}, socketInfoList);
    }

    registerFail(reason, socketInfoList) {
        this.server.sendToList({msg: 'register_fail', reason}, socketInfoList);
    }

    registerSuccess(socketInfoList) {
        this.server.sendToList({msg: 'register_success'}, socketInfoList);
    }

    dataToRoom(data, roomInfo) {
        this.data(data, [roomInfo.player, ...roomInfo.watchers]);
    }

    loginFail(userList, reason, socketInfoList) {
        this.server.sendToList({msg: 'login_fail', reason}, socketInfoList);
    }

    loginSuccess(username, sessionKey, socketInfoList) {
        this.server.sendToList({msg: 'login_success', username, sessionKey}, socketInfoList);
    }


    gameMenu(games, socketInfoList) {
        this.server.sendToList({msg: 'game_menu', games}, socketInfoList);
    }

    data(data, socketInfoList = Object.values(this.server.connectionInfoMap)) {
        this.server.sendToList(data, socketInfoList);
    }

    getRCResponse(id, name, rcText, socketInfoList) {
        this.server.sendToList({msg: 'get_rc_response', id, name, rcText}, socketInfoList);
    }

    saveRCSuccess(socketInfoList) {
        this.server.sendToList({msg: 'save_rc_success'}, socketInfoList);
    }

    play(id, name, socketInfoList) {
        this.server.sendToList({msg: 'play', id, name}, socketInfoList);
    }

    watch(username, socketInfoList) {
        this.server.sendToList({msg: 'watch', username}, socketInfoList);
    }

    setTile(filePath, dataPath, socketInfoList) {
        this.server.sendToList({msg: 'set_tile', filePath, dataPath}, socketInfoList);
    }

    lobbyAdd(roomInfo, socketInfoList) {
        this.server.sendToList(this.roomInfoToLobbyInfo(roomInfo, 'lobby_add'), socketInfoList);
    }

    lobbyUpdate(roomInfo, socketInfoList) {
        this.server.sendToList(this.roomInfoToLobbyInfo(roomInfo, 'lobby_update'), socketInfoList);
    }

    lobbyRemove(roomInfo, socketInfoList) {
        this.server.sendToList(this.roomInfoToLobbyInfo(roomInfo, 'lobby_remove'), socketInfoList);
    }

    terminal(data, socketInfoList) {
        this.server.sendToList({msg: 'terminal', data}, socketInfoList);
    }

    initWatch(playData, terminalData, socketInfoList) {
        this.server.sendToList({msg: 'init_watch', playData, terminalData}, socketInfoList);
    }
}

exports = module.exports = WSSender;
