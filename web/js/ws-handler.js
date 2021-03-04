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

        this.callback['terminal_error'] = (data) => {
           alert(data.error);
        }

        this.callback['save_rc_success'] = (data) => {
            this.siteUIHandler.showEditRCModal(false);
        }

        this.callback['lobby'] = (data) => {
            this.siteUIHandler.setCurrentStatus('lobby');
            this.siteUIHandler.extendMode(false);
            this.siteUIHandler.clearMainContent();
            this.siteUIHandler.clearLoading();
            this.siteUIHandler.addZoom();

            this.gameUIHandler.showTileContent(false);
            this.gameUIHandler.clearMobileButton();
            this.gameUIHandler.clearTerminal();
            this.gameUIHandler.clearTileContent();
            this.gameUIHandler.close_more();
            this.gameUIHandler.closePopup();
            this.gameUIHandler.closeMenu();
            this.gameUIHandler.showGameContent(false);
            this.gameUIHandler.disapplyFontPatch();
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
            if (!data.tileData && data.dataPath) {
                tileData = await fetch(data.dataPath).then(r => r.json());
            } else {
                tileData = data.tileData;
            }
            this.gameUIHandler.initTileRenderer(data.filePath, tileData, {travelClick:(i, click)=>this.sender.travel(i, click)});
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
        this.callback['menu_item'] = (data, info) =>{
            // console.log(data);
            this.gameUIHandler.createMenu(data.list);
        }
        this.callback['update_menu_item'] = (data, info) =>{
            this.gameUIHandler.updateMenu(data.list);
        }
        this.callback['built_in_menu_item'] = (data, info) =>{
            this.gameUIHandler.updateBuiltInInventory(data.list);
        }
        this.callback['clear_built_in_inventory'] = (data, info) =>{
            this.gameUIHandler.clearBuiltInInventory();
        }
        this.callback['close_menu_item'] = (data, info) =>{
            this.gameUIHandler.closeMenu();
        }

        let addButtonLine = (btnText)=>{
            let buttons = btnText.split(/(?<!\\) /).map(e=>{
                let s = e.split('|');
                let button = {};
                if(s.length >= 2){
                    button.key = s[0];
                    button.text = s[1];
                }else if(s.length == 1){
                    button.key = s[0];
                    button.text = s[0];
                }
                let match = button.key.match(/\[\d{1,4}\]/g);
                if(match){
                    for(let e of match){
                        button.key = button.key.replace(e, String.fromCharCode(parseInt(e.split(/[\[\]]/)[1])));
                    }
                }

                if(button.key == '%FULL_SCREEN%'){
                    button.action = 'FULL_SCREEN';
                }else if(button.key == '%PUBLIC_CHAT%'){
                    button.action = 'PUBLIC_CHAT';
                }else if(button.key == '%ROOM_CHAT%'){
                    button.action = 'ROOM_CHAT';
                }else if(button.key == '%CLEAR_CHAT%'){
                    button.action = 'CLEAR_CHAT';
                }else if(button.key == '%KEY%'){
                    button.action = 'KEY';
                }else if(button.key == '%KEY_ENTER%'){
                    button.action = 'KEY_ENTER';
                }
                button.text = button.text.replace(/\\\\ /g, ' ');
                button.key = button.key.replace(/\\r/g, '\r');
                return button;
            });
            let buttonLine = $('<div>');
            buttonLine.addClass('mobile-button-line');
            buttons.forEach(b=>{

                let btn = $('<button type="button" className="mbtn btn btn-light" style="margin-right: 0.2em; min-width: 3em; min-height: 3em;"></button>');
                btn.click(_=>{
                    if(b.action){
                        switch (b.action){
                            case 'FULL_SCREEN':
                                document.body.requestFullscreen();
                                break;
                            case 'PUBLIC_CHAT':
                                this.sender.chatMsg(prompt("Public Chat?"), true);
                                break;
                            case 'ROOM_CHAT':
                                this.sender.chatMsg(prompt("Room Chat?"), false);
                                break;
                            case 'CLEAR_CHAT':
                                $('#mobile-chat').html('');
                                break;
                            case 'KEY':
                            case 'KEY_ENTER':
                                let key = prompt("KEY?");
                                if(key){
                                    let match = key.match(/\[\d{1,4}\]/g);
                                    if(match){
                                        for(let e of match){
                                            key = key.replace(e, String.fromCharCode(parseInt(e.split(/[\[\]]/)[1])));
                                        }
                                    }
                                    key.split('').forEach(k=>this.sender.key(k.charCodeAt(0)));
                                    if(b.action == 'KEY_ENTER'){
                                        this.sender.key(13);
                                    }
                                }
                                break;
                        }
                        return;
                    }
                    this.gameUIHandler.ignoreSharpInput = true;
                    b.key.split('').forEach(k=>this.sender.key(k.charCodeAt(0)));
                    setTimeout(_=>{this.gameUIHandler.ignoreSharpInput = false}, 500);
                });
                btn.text(b.text);
                btn.data('key', b.key);
                buttonLine.append(btn);
            });
            $('#mobile-button-ui').append(buttonLine);
        }


        this.callback['init_watch'] = (data) => {
            this.deferMode = true;
            this.siteUIHandler.clearZoom();
            if(this.gameUIHandler.isMobile){
                this.gameUIHandler.applyMobileInterface();
            }
            this.gameUIHandler.showTileContent(true);
            this.gameUIHandler.showGameContent(true);
            setTimeout(async _ => {
                await this.gameUIHandler.waitTileRendererInit();
                let queue = this.deferQueue;
                this.deferQueue = [];
                this.deferMode = false;

                this.siteUIHandler.clearLoading();

                this.gameUIHandler.initTerminal();

                this.gameUIHandler.openTerminal();
                this.gameUIHandler.writeTerminal(data.terminalData);

                let tData = data.playData.tile;
                this.gameUIHandler.drawTile(tData);
                if(data.playData.cursor){
                    this.gameUIHandler.setCursor(data.playData.cursor);
                } else {
                    this.gameUIHandler.setCursor(0);
                }
                // console.log('status', data.playData.status);
                if(data.playData.status){
                    this.gameUIHandler.update_status(data.playData.status);
                }
                if(data.webRC.EXPERIMENTAL_FONT_PATCH === 'true'){
                    this.gameUIHandler.applyFontPatch();
                }
                this.gameUIHandler.spectorMode=true;
                if(this.gameUIHandler.isMobile){
                     addButtonLine("%ROOM_CHAT%|RoomChat %PUBLIC_CHAT%|PublicChat %CLEAR_CHAT%|ClearChat");
                    $('#mobile-button-ui').show();
                }
                if(data.playData.text){
                    this.gameUIHandler.addText(data.playData.text);
                }
                queue.forEach(d => this.handle(d));
            }, 1000);
        }

        this.callback['debug'] = (data) => {
            console.log('DebugMsg:', data.debug);
        }


        this.callback['init_game'] = (data) => {
            this.deferMode = true;
            // this.sender.key(32);
            this.siteUIHandler.clearZoom();
            if(this.gameUIHandler.isMobile){
                this.gameUIHandler.applyMobileInterface();
            }

            this.gameUIHandler.showTileContent(true);
            this.gameUIHandler.showGameContent(true);
            setTimeout(async _ => {
                await this.gameUIHandler.waitTileRendererInit();
                let queue = this.deferQueue;
                this.deferQueue = [];
                this.deferMode = false;

                this.siteUIHandler.clearLoading();

                // FOR DEBUG
                 this.gameUIHandler.openTerminal();
                
                if(data.webRC.EXPERIMENTAL_FONT_PATCH === 'true'){
                    this.gameUIHandler.applyFontPatch();
                }
                this.gameUIHandler.spectorMode = false;
            if(this.gameUIHandler.isMobile){
                for(let i = 11; i > 0; i--){
                    let btnText = data.webRC[`MOBILE_BUTTON_LINE${i}`];
                    if(btnText){
                        addButtonLine(btnText);
                    }
                }
                $('#mobile-button-ui').show();
            }else{
                $('#mobile-button-ui').hide();
            }
                queue.forEach(d => this.handle(d));
                this.gameUIHandler.initKeyHandler();
            }, 1000);
        }

        this.callback['tile'] = (data) => {
            this.gameUIHandler.drawTile(data.data);
        }

        this.callback['cursor'] = (data) => {
            this.gameUIHandler.setCursor(data.i);
        }

        this.callback['clear_tile'] = (data) => {
            this.gameUIHandler.clearTile();
        }

        this.callback['status'] = (data) => {
            this.gameUIHandler.update_status(data.data);
        }

        this.callback['start_sharp_input'] = (data) => {
            this.sharp_query = data.query + ' ';
            this.sharp_input_text = '';
            this.gameUIHandler.sharp_input(this.sharp_query + this.sharp_input_text);
            if(this.gameUIHandler.isMobile && !this.gameUIHandler.ignoreSharpInput && !this.gameUIHandler.spectorMode){
                    let key = prompt(this.sharp_query);
                    if(key !== ''){
                    let match = key.match(/\[\d{1,4}\]/g);
                    if(match){
                        for(let e of match){
                            key = key.replace(e, String.fromCharCode(parseInt(e.split(/[\[\]]/)[1])));
                        }
                    }
                        key.split('').forEach(k=>this.sender.key(k.charCodeAt(0)));
                        this.sender.key(13);
                    }
            }
            this.gameUIHandler.ignoreSharpInput = false;
        }

        this.callback['sharp_autocomplete'] = (data) => {
            this.gameUIHandler.sharp_autocomplete(data.autocomplete);
        }

        this.callback['sharp_input'] = (data) => {
            if(data.c == 8){
                this.sharp_input_text = this.sharp_input_text.slice(0, -1);
            }else if(data.c == 27){
                this.sharp_input_text = '';
            }else{
                this.sharp_input_text += String.fromCharCode(data.c);

            }
            this.gameUIHandler.sharp_input(this.sharp_query + this.sharp_input_text);
        }

        this.callback['close_sharp_input'] = (data) => {
            this.gameUIHandler.close_sharp_input();
        }

        this.callback['text'] = (data) => {
            /*if (data.list.length > 10 && status == 'play') {
                alert(data.list.join('\n'));
                break;
            }*/

            this.gameUIHandler.addText(data.list);
        }

        this.callback['update_watcher'] = (data) => {
            this.siteUIHandler.updateWatchers(data.userList, data.numberOfWatchers);
        }

        this.callback['start_yn_function'] = (data) => {
            this.gameUIHandler.start_yn_function(data);
        }

        this.callback['end_yn_function'] = (data) => {
            this.gameUIHandler.end_yn_function();
        }

        this.callback['more'] = (data) => {
            this.gameUIHandler.more(data.prompt);
        }

        this.callback['close_more'] = (data) => {
            this.gameUIHandler.close_more();
        }

        this.callback['large_text'] = (data) => {
            this.gameUIHandler.launchLargeTextPopup(data.list.join('\n'));
        }

        this.callback['close_large_text'] = (data) => {
            this.gameUIHandler.closePopup();
        }

        this.callback['inventory'] = (data) => {
            this.gameUIHandler.renderInventory(data.items);
        }

        this.callback['pong'] = (data) => {
            this.siteUIHandler.updateLatency();
        }

        this.callback['chat_msg'] = (data) => {
                data.isPublic ? this.siteUIHandler.publicChat(data.username, data.text, this.gameUIHandler.isMobile) : this.siteUIHandler.roomChat(data.username, data.text, this.gameUIHandler.isMobile);
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
            this.siteUIHandler.sendPing(true);
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
                console.error('Error JSON Parsing:', event.data.length, event.data);
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
            this.siteUIHandler.clearPingInterval();
            this.siteUIHandler.setSubInfo('Socket Error!!! Plz Refresh Page...');

            this.gameUIHandler.showTileContent(false);
            this.gameUIHandler.close_more();
            this.gameUIHandler.closePopup();
            this.gameUIHandler.closeMenu();
            this.gameUIHandler.clearTileContent();
            this.gameUIHandler.showGameContent(false);
        }
        this.client.socket.onclose = closeHandler;
        this.client.socket.onerror = closeHandler;
    }


}

export default WSHandler;
