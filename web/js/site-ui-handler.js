
class SiteUIHandler {
    constructor(sender, config) {
        this.sender = sender;
        this.config = config;

        this.new_message_count = 0;
        this.spectators = {
            count: 0,
            names: ""
        };
        this.history_limit = 25;
        this.message_history = [];
        this.unsent_message = "";
        this.history_pos = -1;
        // this.message;
    }

    showRegisterModal(show) {
        if (show) {
            $('#register-modal').modal('show');
        } else {
            $('#register-modal').modal('hide');
        }
    }
    updateWatchers(userList, numberOfWatchers) {
        $('#spectator_list').text(userList.join(", "));
        if(this.status == 'lobby'){
            $('#spectator_count').text(numberOfWatchers + ' users');
        }else{
            $('#spectator_count').text(numberOfWatchers + ' spectators');
        }
    }

    roomChat(username, text, isMobile = false){
        if(!isMobile){
            this.system_chat( username, text);
        }else{
            this.mobile_system_chat(username, text);
        }
    }
    publicChat(username, text, isMobile = false){
        if(!isMobile){
            this.system_chat('§'  + username, text);
        }else{
            this.mobile_system_chat('§' +username, text);
        }
    }
    updateLatency(){
        $('#latency-info').text(`${new Date().getTime() - this.requestPingTime}MS`);
    }

    showEditRCModal(show) {
        if (show) {
            $('#edit-rc-modal').modal('show');
        } else {
            $('#edit-rc-modal').modal('hide');
        }
    }

    getLocalSessionKey(){
        return localStorage.sessionKey;
    }
    setLocalSessionKey(sessionKey){
        localStorage.sessionKey = sessionKey;
    }


    setEditRCText(text) {
        $('#edit-rc-text').val(text);
    }

    setEditRCTitle(title) {
        $('#edit-rc-title').text(title);
    }

    clearMainContent() {
        $('#main-content tbody').empty();
        $('#game-list').hide();
        // 초기화하고 하이드 처리
    }

    setSubInfo(text) {
        $('#account-info').text(text);
    }

    showGameList(show) {
        show ? $('#game-list').show() : $('#game-list').hide();
    }

    showMenu1(show) {
        show ? $('#top-menu1').show() : $('#top-menu1').hide();
    }

    showMenu2(show) {
        show ? $('#top-menu2').show() : $('#top-menu2').hide();
    }
    setEditRCSaveButtonHandler(handler){
        $('#save-edit-rc-btn').off('click').on('click', handler);
    }


    alertFail(reason) {
        alert(`${reason}`);
    }

    getPlayUsernameFromHash() {
        let play = location.hash.match(/^#play-(.+)/i);
        if (play) {
            return play[1];
        } else {
            return null;
        }
    }
    getWatchTargetUsernameFromHash() {
        let watch = location.hash.match(/^#watch-(.+)/i);
        if (watch) {
            return watch[1];
        } else {
            return null;
        }
    }
    addPlayMenu(games){
        games.forEach((g, i, a) => {
            let e = $(`<a class="dropdown-item" href="#"></a>`);
            e.data('id', g.id);
            e.data('request', 'play');
            e.text(g.name);
            e.click(v => {
                this.sender.play(e.data('id'));
            });
            $('#play-list-div').append(e);
            if (a.length !== i + 1) {
                $('#play-list-div').append($(`<div class="dropdown-divider"></div>`));
            }
        });
    }
    clearPlayMenu(){
        $('#play-list-div').empty();
    }
    getEditRCText(){
        return $('#edit-rc-text').val();
    }



    addEditRCMenu(games){
        games.forEach((g, i, a) => {
            let e = $(`<a class="dropdown-item" href="#"></a>`);
            e.data('id', g.id);
            e.data('request', 'edit-rc');
            e.text(g.name);
            e.click(v => {
                this.sender.getRC(e.data('id'));
            });
            $('#edit-rc-list-div').append(e);
            if (a.length !== i + 1) {
                $('#edit-rc-list-div').append($(`<div class="dropdown-divider"></div>`));
            }
        });
    }
    clearEditRCMenu(){
        $('#edit-rc-list-div').empty();
    }

    extendMode(enable) {
        if (enable) {
            this.showMenu1(false);
            this.showMenu2(false);
            $('body').css('padding-top', '0px');
            $('#main-content').css('margin-top', '0px');
            $('#main-content').addClass('extend');
        } else {
            this.showMenu1(true);
            this.showMenu2(true);
            $('body').css('padding-top', '80px');
            $('#main-content').css('margin-top', '50px');
            $('#main-content').removeClass('extend');
        }
    }

    generateGameTr(data) {
        let tr = $('<tr>');
        let te1 = $('<th scope="row"></th>');
        te1.text(data.username);
        tr.append(te1);
        let te2 = $('<td>');
        te2.text(data.gameName);
        tr.append(te2);
        let te3 = $('<td>');
        let startDate = new Date(data.startDate);
        let delta = CoreUtils.timeDelta2Simple(new Date() - startDate);
        let dateString = `${startDate.getFullYear().toString()}-${(startDate.getMonth() + 1).toString().padStart(2, 0)}-${startDate.getDate().toString().padStart(2, 0)} ${startDate.getHours().toString().padStart(2, 0)}:${startDate.getMinutes().toString().padStart(2, 0)}:${startDate.getSeconds().toString().padStart(2, 0)}`;
        te3.text(`${dateString} / ${delta}`);
        tr.append(te3);
        let te4 = $('<td>');
        te4.text(data.numberOfWatcher);
        tr.append(te4);
        tr.data('original', data);
        tr.click(e => {
            // console.log('okay');
            this.sender.watch(data.username);
        });
        tr.css('cursor', 'pointer');
        return tr.get(0);
    }

    updateAllGameTr() {
        $(`#game-list tbody tr`).toArray().map(e => $(e).data('original')).forEach(e => this.updateGameTr(e));
    }

    isExistGameTr(data) {
        return this.getGameTrByData(data).length !== 0;
    }

    clearZoom(){
        $('body').removeClass('auto-zoom');
    }

    addZoom(){
        $('body').addClass('auto-zoom');
    }

    appendGameTr(data) {
        if (!(data instanceof HTMLElement)) {
            data = this.generateGameTr(data);
        }
        $('#game-list tbody').append(data);
    }

    setLoading(text) {
        $('#loading img').hide();
        this.clearMainContent();
        this.extendMode(true);
        let randomImageIndex = Math.floor($('#loading img').length * Math.random());
        $($('#loading img').get(randomImageIndex)).show();
        if (text) {
            this.setLoadingText(text);
        }
        $('#loading').show();
    }

    clearLoading() {
        $('#loading').hide();
    }

    setLoadingText(text) {
        $('#loading-text').text(text);
    }

    removeGameTr(data) {
        this.getGameTrByData(data).remove();
    }

    getGameTrByData(data) {
        return $($(`#game-list tbody tr`).toArray().filter(e => $(e).data('original').username === data.username));
    }

    updateGameTr(data) {
        let tr = this.getGameTrByData(data);
        let parentNode = tr.get(0).parentNode
        let nextSibling = tr.get(0).nextSibling;
        parentNode.insertBefore(this.generateGameTr(data), nextSibling);
        tr.remove();
    }

    setLoginUI() {
        $('#login-form').hide();
        $('#register-btn').hide();
        $('#logout-btn').show();
    }
    mobile_system_chat(sender, msg){
        $("#mobile-chat").append($('<span/>', {
            class: 'chat_sender',
            text: sender
        }));
        ;
        $("#mobile-chat").append(": ");
        $("#mobile-chat").append($('<span/>', {
            class: 'chat_msg',
            text: msg
        }));
        $('#mobile-chat').scrollTop($('#mobile-chat')[0].scrollHeight);
        $("#mobile-chat").append("<br>");
    }

    linkify(text){
        let ALLOWED_PROTOCOLS = ["http", "https", "ftp", "irc"];

        let ba_linkify = window.linkify;

        function escape_html(str) {
            return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        return (function (text)
        {
            return ba_linkify(text,
                {
                    callback: function (text, href)
                    {
                        if (!href)
                            return escape_html(text);
                        if (!ALLOWED_PROTOCOLS.some(function (p) {
                            return href.indexOf(p+ "://") === 0; }))
                        {
                            return escape_html(text);
                        }
                        return $("<a>").attr("href", href).attr("target", "_blank")
                            .text(text)[0].outerHTML;
                    }
                });
        })(text);
    }

    system_chat(sender, msg) {
        $("#chat_history").append($('<span/>', {
            class: 'chat_sender',
            text: sender
        }));
        ;
        $("#chat_history").append(": ");
        let chat_msg = $('<span/>', {
            class: 'chat_msg'
        });
        chat_msg.html(this.linkify(msg));
        $("#chat_history").append(chat_msg);
        $("#chat_history").append("<br>");
        $('#chat_history_container').scrollTop($('#chat_history_container')[0].scrollHeight);
        if ($("#chat_body").css("display") === "none") {
            $("#message_count").html("new messages (Press F12)");
            $("#message_count").toggleClass("has_new", true);
        }
        $('#built-in-inventory').css('height', `calc(100vh - ${($('#browserhack-status').height() + 10)}px - ${($('#chat').height() + 12) + 'px'})`);
    }

    toggle() {
        if ($("#chat_body").css("display") === "none") {
            $("#chat_body").slideDown(200);
            this.new_message_count = 0;
            //update_message_count();
            $("#message_count").html("(Esc: back to game)");
            $('#chat_history_container').scrollTop($('#chat_history_container')[0].scrollHeight);
        } else {
            $("#chat_body").slideUp(200);
            //update_message_count();
            $('body').focus();
        }
        setTimeout(_=>{
            $('#built-in-inventory').css('height', `calc(100vh - ${($('#browserhack-status').height() + 10)}px - ${($('#chat').height() + 12) + 'px'})`);
        },300);
    }

    chat_message_send(e) {
        // console.log(e);
        // The Enter key sends a message.
        if (e.which == 13) {
            var content = $("#chat_input").val();
            e.preventDefault();
            e.stopPropagation();
            if (content != "") {
                let isPublic = content.startsWith(" ") || this.status === 'lobby';
                this.sender.chatMsg(content.trim(), isPublic);
                $("#chat_input").val("");
                $('#chat_history_container').scrollTop($('#chat_history_container')[0].scrollHeight);
                this.message_history.unshift(content)
                if (this.message_history.length > this.history_limit)
                    this.message_history.length = this.history_limit;
                this.history_pos = -1;
                this.unsent_message = ""
            }
            return false;
        }
// Up arrow to access message history.
        else if (e.which == 38 && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            var lim = Math.min(this.message_history.length, this.history_limit)
            if (this.message_history.length && this.history_pos < lim - 1) {
                /* Save any unsent input line before reading history so it can
                 * be reloaded after going past the beginning of message
                 * history with down arrow. */
                var cur_line = $("#chat_input").val()
                if (this.history_pos == -1)
                    this.unsent_message = cur_line;
                $("#chat_input").val(this.message_history[++this.history_pos]);
            }
        }
// Down arrow to access message history and any unsent message.
        else if (e.which == 40 && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            if (this.message_history.length && this.history_pos > -1) {
                if (this.history_pos == 0) {
                    this.message = this.unsent_message;
                    this.history_pos--;
                } else
                    this.message = this.message_history[--this.history_pos];
                $("#chat_input").val(this.message);
            }
        }
// Esc key to return to game.
        else if (e.which == 27) {
            e.preventDefault();
            e.stopPropagation();
            // this.toggle();
            $(document.activeElement).blur();
        }
        return true;
    }

    sendPing(force){
        if(this.status ==='lobby' || force){
            this.requestPingTime = new Date().getTime();
            this.sender.ping();
        }
    }

    init() {
        $("#archive-link").attr('href', this.config.archiveURL);
        $("#chat_caption").bind("click", this.toggle);
        $('#chat_input').bind('keydown', this.chat_message_send.bind(this));
        $('#register-btn').click(e => this.showRegisterModal(true));
        $('#close-register-btn').click(e => this.showRegisterModal(false));
        $('#close-edit-rc-btn').click(e => this.showEditRCModal(false));
        $('#logout-btn').click(e => {
            delete localStorage.sessionKey;
            location.href = "/";
        });
        $('#login-form').submit(e => {
            let data = $('#login-form').serializeArray().reduce((c, e) => (c[e.name] = e.value, c), {});
            this.sender.login(data.username, data.password);
            e.preventDefault();
        });
        $('#register-form').submit(e => {
            e.preventDefault();
            let data = $('#register-form').serializeArray().reduce((c, e) => (c[e.name] = e.value, c), {});
            if (data.password !== data.confirm) {
                alert(`<Confirm Error>`);
                return;
            }
            this.sender.register(data.username, data.password, data.email);
        });

        setInterval(_ => {
            if (this.status === 'lobby') {
                this.updateAllGameTr();
            }
        }, 1000);

        this.pingIntervalKey = setInterval(this.sendPing.bind(this), 1000 * 3);
    }

    clearPingInterval(){
        clearInterval(this.pingIntervalKey);
    }


    setCurrentStatus(status, data){
        this.status = status;
        if(status === 'lobby'){
            location.hash = 'lobby';
        }else if(status === 'play'){
            location.hash = `play-${data}`;
        }else if(status === 'watch'){
            location.hash = `watch-${data}`;
        }
    }

}

export default SiteUIHandler;