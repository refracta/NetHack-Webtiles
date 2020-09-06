class WSHandler {
    constructor(initHandle) {
        this.siteUIHandler = initHandle.siteUIHandler;
        this.gameUIHandler = initHandle.gameUIHandler;
        this.client = initHandle.client;
        if (initHandle.sender) {
            this.sender = initHandle.sender;
        } else if (self.WSSender) {
            this.sender = new WSSender(this.client);
        }
        this.callback = {};
        this.deferQueue = [];
        this.callback['register_fail'] = (data) => {
            this.siteUIHandler.alertFail(`<Register Fail>\n${data.reason}`);
        }

        this.callback['login_fail'] = (data) => {
            this.siteUIHandler.alertFail(`<Login Fail>\n${data.reason}`);
        }

        this.callback['register_success'] = (data) => {
            this.siteUIHandler.showRegisterModal(false);
        }

        this.callback['login_success'] = (data) => {
            this.loginInfo = data;
            this.siteUIHandler.setLocalSessionKey(data.sessionKey);
            this.siteUIHandler.setLoginUI();
            this.siteUIHandler.setSubInfo(`Welcome to Hacktiles ${this.loginInfo.username}! XD`);
            let playUserName = this.siteUIHandler.getPlayUsernameFromHash();
            if (playUserName) {
                this.sender.play(playUserName);
            }
        }

        this.callback['game_menu'] = (data) => {
            this.siteUIHandler.clearPlayMenu();
            this.siteUIHandler.addPlayMenu(data.games);
            this.siteUIHandler.clearEditRCMenu();
            this.siteUIHandler.addEditRCMenu(data.games);
        }

        this.callback['get_rc_response'] = (data) => {
            this.siteUIHandler.setEditRCTitle(`Edit RC - ${data.name} (${data.id})`);
            this.siteUIHandler.setEditRCText(data.rcText);
            this.siteUIHandler.showEditRCModal(true);
            this.siteUIHandler.setEditRCSaveButtonHandler(e => {
                this.sender.saveRC(data.id, this.siteUIHandler.getEditRCText());
            });
        }

        this.callback['save_rc_success'] = (data) => {
            this.siteUIHandler.showEditRCModal(false);
        }

        this.callback['lobby'] = (data) => {
            this.siteUIHandler.setCurrentStatus('lobby');
            this.siteUIHandler.extendMode(false);
            this.siteUIHandler.clearMainContent();
            this.siteUIHandler.clearLoading();

            this.gameUIHandler.showTileContent(false);
            this.gameUIHandler.clearTerminal();
            this.gameUIHandler.clearTileContent();
            this.gameUIHandler.showGameContent(false);

            this.siteUIHandler.showGameList(true);

            data.gameList.forEach(g => this.siteUIHandler.appendGameTr(g));
        }

        this.callback['play'] = (data) => {
            this.siteUIHandler.setCurrentStatus('play', data.id);
            this.siteUIHandler.setLoading("Loading...");
            this.gameUIHandler.initTerminal();
        }

        this.callback['terminal'] = (data) => {
            this.gameUIHandler.writeTerminal(data.data);
        }

        this.callback['set_tile'] = async (data) => {
            this.gameUIHandler.showTileContent(false);
            let tileData;
            if (data.dataPath) {
                tileData = await fetch(data.dataPath).then(r => r.json());
            } else {
                tileData = data.tileData;
            }
            this.gameUIHandler.initTileRenderer(data.filePath, tileData);
        }

        this.callback['lobby_add'] = (data) => {
            this.siteUIHandler.updateAllGameTr();
            this.siteUIHandler.appendGameTr(data);
        }

        this.callback['lobby_update'] = (data) => {
            this.siteUIHandler.updateGameTr(data);
        }

        this.callback['lobby_remove'] = (data) => {
            this.siteUIHandler.removeGameTr(data);
        }

        this.callback['game_close_wait'] = (data) => {
            this.siteUIHandler.setLoadingText('Another game session saving...');
        }

        this.callback['watch'] = (data) => {
            this.siteUIHandler.setCurrentStatus('watch', data.username);
            this.siteUIHandler.setLoading("Loading...");
        }


        this.callback['init_watch'] = (data) => {
            this.deferMode = true;
            setTimeout(async _ => {
                await this.gameUIHandler.waitTileRendererInit();
                let queue = this.deferQueue;
                this.deferQueue = [];
                this.deferMode = false;

                this.siteUIHandler.clearLoading();
                this.gameUIHandler.showTileContent(true);
                this.gameUIHandler.showGameContent(true);

                this.gameUIHandler.initTerminal();

                this.gameUIHandler.openTerminal();
                this.gameUIHandler.writeTerminal(data.terminalData);

                let tData = data.playData.tile;
                this.gameUIHandler.drawTile(tData);
                // console.log('status', data.playData.status);
                this.gameUIHandler.update_status(data.playData.status);

                queue = [{msg: 'text', list: data.playData.text}, ...queue];
                queue.forEach(d => this.handle(d));
            }, 1000);
        }

        this.callback['init_game'] = (data) => {
            this.deferMode = true;
            setTimeout(async _ => {
                await this.gameUIHandler.waitTileRendererInit();

                let queue = this.deferQueue;
                this.deferQueue = [];
                this.deferMode = false;

                this.siteUIHandler.clearLoading();
                // this.sender.key(32);
                this.gameUIHandler.showTileContent(true);
                this.gameUIHandler.showGameContent(true);
                this.gameUIHandler.openTerminal();

                queue.forEach(d => this.handle(d));
                this.gameUIHandler.initKeyHandler();
            }, 1000);
        }

        this.callback['tile'] = (data) => {
            // 임시
            this.gameUIHandler.clearTempUI();
            this.gameUIHandler.drawTile(data.data);
        }

        this.callback['clear_tile'] = (data) => {
            this.gameUIHandler.clearTile();
        }

        this.callback['status'] = (data) => {
            this.gameUIHandler.update_status(data.data);
        }

        this.callback['text'] = (data) => {
            this.gameUIHandler.clearTempUI();
            /*if (data.list.length > 10 && status == 'play') {
                alert(data.list.join('\n'));
                break;
            }*/

            this.gameUIHandler.addText(data.list);
            this.gameUIHandler.resizeMessageContent();
        }

        this.callback['update_watcher'] = (data) => {
            this.siteUIHandler.updateWatchers(data.userList, data.numberOfWatchers);
        }

        this.callback['more'] = (data) => {
            this.gameUIHandler.more(data.prompt);
        }

        this.callback['inventory'] = (data) => {
            this.gameUIHandler.renderInventory(data.items);
        }

        this.callback['chat_msg'] = (data) => {
            data.isPublic ? this.siteUIHandler.publicChat(data.username, data.text) : this.siteUIHandler.roomChat(data.username, data.text);
        }
        this.gameUIHandler.initResizeMessageHandler();
    }

    handle(data) {
        let targetCallback = this.callback[data.msg];
        if (targetCallback) {
            targetCallback(data);
        }
    }

    init() {

        this.client.socket.onopen = (event) => {
            if (this.siteUIHandler.getLocalSessionKey()) {
                this.sender.loginBySessionKey(this.siteUIHandler.getLocalSessionKey());
            }
            let watchTargetUsername = this.siteUIHandler.getWatchTargetUsernameFromHash();
            if (watchTargetUsername) {
                this.sender.watch(watchTargetUsername);
            } else {
                this.sender.lobby();
            }
        }
        /*
        this.socket.onerror = (event) => {
            alert("Connection Error!");
            //console.log("Server error message: ", event.data);
        }
        this.socket.onclose = (event) => {
            alert("Connection Close!");
            //console.log("Server error message: ", event.data);
        }
         */
        this.client.socket.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                console.error('Error JSON Parsing:', message);
            }
            // console.log('RAW DATA:' ,data);
            if (this.deferMode) {
                this.deferQueue.push(data);
                return;
            }
            this.handle(data);
        }

        let closeHandler = (event) => {
            this.siteUIHandler.clearMainContent();
            this.siteUIHandler.extendMode(false);
            this.siteUIHandler.showMenu1(true);
            this.siteUIHandler.showMenu2(false);
            this.siteUIHandler.clearLoading();
            this.siteUIHandler.setSubInfo('Socket Error!!! Plz Refresh Page...');

            this.gameUIHandler.showTileContent(false);
            this.gameUIHandler.clearTileContent();
            this.gameUIHandler.showGameContent(false);
        }
        this.client.socket.onclose = closeHandler;
        this.client.socket.onerror = closeHandler;
    }


}

export default WSHandler;