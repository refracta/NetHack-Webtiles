import TileRenderer from "./tile-renderer.js";

function timeDelta2Simple(delta) {
    if (!delta) {
        return null;
    }
    delta = delta > 0 ? delta : 0;
    delta = Math.floor(delta / 1000);
    if (delta < 60) {
        return delta + 's';
    } else if (delta < 60 * 60) {
        return Math.floor(delta / 60) + 'm';
    } else if (delta < 24 * 60 * 60) {
        return Math.floor(delta / (60 * 60)) + 'h';
    } else if (delta < 365 * 24 * 60 * 60) {
        return Math.floor(delta / (24 * 60 * 60)) + 'd';
    } else {
        return Math.floor(delta / (365 * 24 * 60 * 60)) + 'y';
    }
}

function waitFor(vf, t) {
    return new Promise(r => {
        let i = setInterval(_ => {
            try {
                let v = vf();
                if (v) {
                    clearInterval(i);
                    r(v);
                }
            } catch (e) {
            }
        }, t);
    });
}

function resizeMessageContent() {
    let leftHeight = $('body').height() - $('#browserhack-status').height() - $('#tile-content').height();
    while ($('#message-content span:hidden').length > 20) {
        $($('#message-content span:hidden').get(0)).remove();
    }
    $('#message-content span:hidden').show();
    if (leftHeight > 0) {
        while ($('#message-content').height() > leftHeight) {
            $($('#message-content span:visible').get(0)).hide();
        }
    } else {
        $('#message-content span:visible').hide();
    }

}

function create_highlight_element(old_value, new_value, invert) {
    var ele = document.createElement('span');
    var number_pattern = /^(-?\d+)(?:\/(\*\*|-?\d+))?$/;
    var old_match = old_value.match(number_pattern);
    var new_match = new_value.match(number_pattern);
    if ((old_match != null) && (new_match != null)) {
        var diff = parseInt(new_match[1]) - parseInt(old_match[1]);
        if (diff != 0) { // major difference
            ele.textContent = new_value;
            var better = (diff > 0);
            if (invert) better = !better;
            ele.className = (better ? 'green' : 'red');
        } else if (new_match[2] == old_match[2]) { // the same
            ele.textContent = new_value;
        } else { // minor difference
            var ele1 = document.createElement('span');
            ele1.textContent = new_match[1] + '/';
            ele.appendChild(ele1);

            // '**' is 100
            var old_value2 = (old_match[2] == '**' ? 100 : (parseInt(old_match[2]) || 0))
            var new_value2 = (new_match[2] == '**' ? 100 : (parseInt(new_match[2]) || 0))
            var better = new_value2 > old_value2;
            if (invert) better = !better;
            var ele2 = document.createElement('span');
            ele2.textContent = new_match[2];
            ele2.className = (better ? 'green' : 'red');
            ele.appendChild(ele2);
        }
    } else { // nothing special
        ele.textContent = new_value;
    }
    return ele;
}

function update_status(data) {
    console.log('isnot?', data)
    var win = $('#browserhack-status')[0];

    // creates a bootstrap statusbar given a max and current value
    var getProgressBar = function (max, value, style, text) {
        var percent = Math.round((1.0 * value / max) * 100);
        var div = document.createElement('div');
        div.className = 'progress';
        div.style.minHeight = "25px";
        div.innerHTML = '<div class="progress-bar bg-'
            + style + '" role="progressbar" aria-valuenow="'
            + value + '" aria-valuemin="0" aria-valuemax="'
            + max + '" style="width:' + percent + '%"><span>'
            + text + value + ' / ' + max + '</span></div>';
        return div;
    };

    // draws a hexagon at given position
    // radii contains each of the hexagon's vertex distance to the center
    var drawHexagon = function (ctx, x, y, radii) {
        var startAngle = (-Math.PI / 2);
        var a = (Math.PI * 2) / 6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(startAngle);
        ctx.moveTo(radii[0], 0);
        for (var i = 1; i < 6; i++) {
            ctx.lineTo(radii[i] * Math.cos(a * i), radii[i] * Math.sin(a * i));
        }
        ctx.closePath();
        ctx.restore();
    };

    // ST:Red   DX:Orange CO:Yellow
    // IN:Green WI:Blue   CH:Purple
    var colors = ['#8c4d4d', '#b38a50', '#bebe70', '#587e54', '#607689', '#8e7d99'];

    // draws points on each of the hexagon's vertex with the stats' color
    var drawHexagonPoints = function (ctx, x, y, r) {
        var startAngle = (-Math.PI / 2);
        var a = (Math.PI * 2) / 6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(startAngle);
        for (var i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(r * Math.cos(a * i), r * Math.sin(a * i), 2.5, 0, 2 * Math.PI, false);
            ctx.fillStyle = colors[i];
            ctx.fill();
            ctx.closePath();
        }
        ctx.restore();
    };

    // returns the full HTML of an element
    var outerHTML = function (element) {
        var container = document.createElement("div");
        container.appendChild(element.cloneNode(true));
        return container.innerHTML;
    }

    console.log(data[13].text);
    var status1 = [data[13].text, data[0].text, "ST:", data[1].text, "DX: ", data[2].text, "CO:", data[3].text, "IN:", data[4].text, "WI:", data[5].text, "CH:", data[6].text, 15, 16, 17, 18, 19, data[7].text].map(e => e + '');
    // console.log(data[8].text);
    var status2 = [21, data[20].text, 23, 24, data[18].text, 26, data[19].text, 28, 29, data[11].text, 31, data[12].text, 33, 34, data[14].text, 36, 1, 38, [data[9].text, data[17].text].filter(e => e !== "").join(', '), 40].map(e => e + '');
    console.log(status2);
    // if no old status, copy current status
    var old_status = [status1, status2];

    // clear status bar
    win.innerHTML = '';

    var table;
    var tr;
    var td;

    // first table contains name, rank on the first line,
    // and level, alignment, and status effects on the second
    table = document.createElement('table');
    table.className = 'status-table';
    // player name and rank
    tr = table.insertRow();
    td = tr.insertCell();
    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = status1[1];
    td.appendChild(name);
    // level, alignment and status effects
    tr = table.insertRow();
    td = tr.insertCell();
    td.style.textAlign = 'right';
    var lvl = create_highlight_element(old_status[1][16], status2[16]);
    var effect = status2[18].trim();
    var alignLvl = document.createElement('span');
    alignLvl.className = 'highlight';
    alignLvl.innerHTML = 'LV <b style="font-size:14pt;">' + outerHTML(lvl) + '</b>, ' + status1[status1.length - 1].trim();
    if (effect != "")
        alignLvl.innerHTML += ', <b style="color:white;">' + effect + '</b>';
    td.appendChild(alignLvl);
    win.appendChild(table);

    // next table contains health and power bars
    table = document.createElement('table');
    table.className = 'status-table';
    table.style.width = '200px';
    table.style.marginLeft = '20px';
    table.style.marginRight = '10px';
    table.style.marginTop = '6px';
    // HP
    tr = table.insertRow();
    td = tr.insertCell();
    td.appendChild(getProgressBar(status2[6], status2[4], 'danger', 'HP: '));
    // Pw
    tr = table.insertRow();
    td = tr.insertCell();
    td.appendChild(getProgressBar(status2[11], status2[9], 'info', 'PW: '));
    win.appendChild(table);

    // list of stats in order, for hexagon
    var stats = [];

    // next table contains stats on two rows
    table = document.createElement('table');
    table.className = 'status-table';
    table.style.marginLeft = '10px';
    tr = table.insertRow();
    for (var i = 2; i < 14; i += 2) {
        if (i == 8)
            tr = table.insertRow();
        td = tr.insertCell();
        var str = status1[i].trim()
        str = str.substring(0, str.length - 1)
        var statName = document.createElement('div');
        statName.className = 'statName';
        statName.innerHTML = '<b>' + str.toUpperCase() + '</b>';
        statName.style.textAlign = 'center';
        statName.style.color = colors[(i - 2) / 2];
        td.appendChild(statName);
        var stat = create_highlight_element(old_status[0][i + 1], status1[i + 1]);
        stat.className = 'stat';
        stat.style.display = "grid";
        stat.style.textAlign = "center";
        td.appendChild(stat);
        // store stat in list for later use in hexagon
        // we treat 18/xx as 18 for simplicity
        var statValue = status1[i + 1];
        if (statValue.length > 2)
            statValue = statValue.substring(0, 2);
        stats.push(parseInt(statValue));

    }
    win.appendChild(table);

    // canvas for stat hexagon
    var canvas = document.createElement('canvas');
    var w = 56;
    var r = w / 2;
    canvas.className = 'status-table';
    canvas.width = w;
    canvas.height = w;
    var ctx = canvas.getContext('2d');
    win.appendChild(canvas);
    // draw full hexagon
    ctx.beginPath();
    drawHexagon(ctx, r, r, [r - 1, r - 1, r - 1, r - 1, r - 1, r - 1]);
    ctx.strokeStyle = 'rgba(147,161,161, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // draw inside diagonals, dashed
    var a = (Math.PI * 2) / 6;
    for (i = 0; i < 3; ++i) {
        ctx.beginPath();
        ctx.save();
        ctx.translate(r, r);
        ctx.rotate(-Math.PI / 2 + a * i);
        ctx.moveTo(r - 3, 0);
        ctx.lineTo((r - 3) * Math.cos(Math.PI), (r - 3) * Math.sin(Math.PI));
        ctx.closePath();
        ctx.restore();
        ctx.strokeStyle = 'rgba(147,161,161, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
    }
    // normalize stats using the max attributes from https://nethackwiki.com/wiki/Attribute#Maximum_attributes
    stats = [stats[0] / 18.0, stats[1] / 20.0, stats[2] / 20.0, stats[3] / 20.0, stats[4] / 20.0, stats[5] / 18.0];
    // square it and multiply by radius
    // squaring makes the graph non linear and feels better:
    // small stats are smaller, and good stats really stand out
    stats = stats.map(function (n) {
        return r * n * n
    });
    // draw the stats themselves
    ctx.setLineDash([]);
    ctx.beginPath();
    drawHexagon(ctx, r, r, stats);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    // draw the colored points
    drawHexagonPoints(ctx, r, r, r - 2);

    // last status: Dlvl, AC, Cash
    // TODO: turns
    var dlvl = document.createElement('i');
    dlvl.classList.add('fa', 'fa-compass', 'status-misc');
    dlvl.innerHTML = ' ' + status2[1].split(':')[1].split(' ')[0];
    win.appendChild(dlvl);
    // No turn in current status lines?
    /*
    var turn = document.createElement('i');
    turn.classList.add('fa', 'fa-hourglass-half', 'status-misc');
    turn.innerHTML = ' ' + '0';
    win.appendChild(turn);
    */
    var ac = document.createElement('i');
    ac.classList.add('fa', 'fa-shield', 'status-misc');
    ac.innerHTML = ' ' + outerHTML(create_highlight_element(old_status[1][14], status2[14], true));
    win.appendChild(ac);
    var gold = document.createElement('i');
    gold.classList.add('fa', 'fa-usd', 'status-misc');
    gold.innerHTML = ' ' + outerHTML(create_highlight_element(old_status[1][2], status2[2]));
    win.appendChild(gold);

    // update old status to current
    //old_status = [status1, status2];
}

let statusData = {};

class UIHandler {
    showRegisterModal(show) {
        if (show) {
            $('#register-modal').modal('show');
        } else {
            $('#register-modal').modal('hide');
        }
    }

    showEditRCModal(show) {
        if (show) {
            $('#edit-rc-modal').modal('show');
        } else {
            $('#edit-rc-modal').modal('hide');
        }
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

    showTileContent(show) {
        show ? $('#tile-content').show() : $('#tile-content').hide();
    }

    clearTileContent() {
        if (this.tileRenderer) {
            this.tileRenderer.game.destroy(true)
        }
        $('#tile-content').empty();
    }

    showGameContent(show) {
        show ? $('#game-content').show() : $('#game-content').hide();
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
        let delta = timeDelta2Simple(new Date() - startDate);
        let dateString = `${startDate.getFullYear().toString()}-${(startDate.getMonth() + 1).toString().padStart(2, 0)}-${startDate.getDate().toString().padStart(2, 0)} ${startDate.getHours().toString().padStart(2, 0)}:${startDate.getMinutes().toString().padStart(2, 0)}:${startDate.getSeconds().toString().padStart(2, 0)}`;
        te3.text(`${dateString} / ${delta}`);
        tr.append(te3);
        let te4 = $('<td>');
        te4.text(data.numberOfWatcher);
        tr.append(te4);
        tr.data('original', data);
        tr.click(e => {
            console.log('okay');
            this.wsClient.send({'msg': 'watch', username: data.username});
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

    test() {
        this.wsClient.send({msg: 'test'});
    }

    setLoginUI() {
        $('#login-form').hide();
        $('#register-btn').hide();
        $('#logout-btn').show();
    }

    init(wsClient) {

        function system_chat(sender, msg) {
            $("#chat_history").append($('<span/>', {
                class: 'chat_sender',
                text: sender
            }));
            ;
            $("#chat_history").append(": ");
            $("#chat_history").append($('<span/>', {
                class: 'chat_msg',
                text: msg
            }));
            $("#chat_history").append("<br>");
            $('#chat_history_container').scrollTop($('#chat_history_container')[0].scrollHeight);
            if ($("#chat_body").css("display") === "none") {
                $("#message_count").html("new system messages (Press F12)");
                $("#message_count").toggleClass("has_new", true);
            }
        }

        function toggle() {
            if ($("#chat_body").css("display") === "none") {
                $("#chat_body").slideDown(200);
                new_message_count = 0;
                //update_message_count();
                $("#message_count").html("(Esc: back to game)");
                $('#chat_history_container').scrollTop($('#chat_history_container')[0].scrollHeight);
            } else {
                $("#chat_body").slideUp(200);
                //update_message_count();
                $('body').focus();
            }
        }

        $("#chat_caption").bind("click", toggle);


        var new_message_count = 0;
        var spectators = {
            count: 0,
            names: ""
        };
        var history_limit = 25;
        var message_history = [];
        var unsent_message = "";
        var history_pos = -1;

        let message;

        let chat_message_send = (e) => {
            console.log(e);
            // The Enter key sends a message.
            if (e.which == 13) {
                var content = $("#chat_input").val();
                e.preventDefault();
                e.stopPropagation();
                if (content != "") {
                    let isPublic = content.startsWith(" ") || status === 'lobby';
                    this.wsClient.send({
                        msg: 'chat_msg',
                        text: content.trim(), isPublic
                    });
                    $("#chat_input").val("");
                    $('#chat_history_container').scrollTop($('#chat_history_container')[0].scrollHeight);
                    message_history.unshift(content)
                    if (message_history.length > history_limit)
                        message_history.length = history_limit;
                    history_pos = -1;
                    unsent_message = ""
                }
                return false;
            }
            // Up arrow to access message history.
            else if (e.which == 38 && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                var lim = Math.min(message_history.length, history_limit)
                if (message_history.length && history_pos < lim - 1) {
                    /* Save any unsent input line before reading history so it can
                     * be reloaded after going past the beginning of message
                     * history with down arrow. */
                    var cur_line = $("#chat_input").val()
                    if (history_pos == -1)
                        unsent_message = cur_line;
                    $("#chat_input").val(message_history[++history_pos]);
                }
            }
            // Down arrow to access message history and any unsent message.
            else if (e.which == 40 && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                if (message_history.length && history_pos > -1) {
                    if (history_pos == 0) {
                        message = unsent_message;
                        history_pos--;
                    } else
                        message = message_history[--history_pos];
                    $("#chat_input").val(message);
                }
            }
            // Esc key to return to game.
            else if (e.which == 27) {
                e.preventDefault();
                e.stopPropagation();
                toggle();
                $(document.activeElement).blur();
            }
            return true;
        }
        $('#chat_input').bind('keydown', chat_message_send);


        this.wsClient = wsClient;
        $('#register-btn').click(e => this.showRegisterModal(true));
        $('#close-register-btn').click(e => this.showRegisterModal(false));
        $('#close-edit-rc-btn').click(e => this.showEditRCModal(false));
        $('#logout-btn').click(e => {
            delete localStorage.sessionKey;
            location.href = "/";
        });
        $('#login-form').submit(e => {
            let data = $('#login-form').serializeArray().reduce((c, e) => (c[e.name] = e.value, c), {});
            data.msg = 'login';
            wsClient.send(data);
            e.preventDefault();
        });
        $('#register-form').submit(e => {
            e.preventDefault();
            let data = $('#register-form').serializeArray().reduce((c, e) => (c[e.name] = e.value, c), {});
            if (data.password !== data.confirm) {
                alert(`<Confirm Error>`);
                return;
            }
            delete data.confirm;
            data.msg = 'register';
            wsClient.send(data);
        });
        // TODO 모두 클래스 멤버로  바꾸기
        let loginInfo;
        let status;
        let gameInfo;
        let moreStatus = false;
        let closeHandler = (event) => {
            this.clearMainContent();
            this.extendMode(false);
            this.showMenu1(true);
            this.showMenu2(false);
            this.clearLoading();
            this.showTileContent(false);
            this.clearTileContent();
            this.showGameContent(false);
            this.setSubInfo('Socket Error!!! Plz Refresh Page...');
        }
        wsClient.socket.onclose = closeHandler;
        wsClient.socket.onerror = closeHandler;
        setInterval(_ => {
            if (status === 'lobby') {
                this.updateAllGameTr();
            }
        }, 1000);
        wsClient.handler = async (data, socket) => {
            console.log(data);
            if (this.loadingQueue) {
                this.loadingQueue.push(data);
                return;
            }

            switch (data.msg) {
                case 'register_fail':
                    alert(`<Register Fail>\n${data.reason}`);
                    break;
                case 'login_fail':
                    alert(`<Login Fail>\n${data.reason}`);
                    break;
                case 'register_success':
                    this.showRegisterModal(false);
                    break;
                case 'login_success':
                    loginInfo = data;
                    localStorage.sessionKey = data.sessionKey;
                    this.setLoginUI();
                    this.setSubInfo(`Welcome to Hacktiles ${loginInfo.username}! XD`);
                    let play = location.hash.match(/^#play-(.+)/i);
                    if (play) {
                        wsClient.send({msg: 'play', id: play[1]});
                    }
                    break;
                case 'game_menu':
                    $('#play-list-div').empty();
                    data.games.forEach((g, i, a) => {
                        let e = $(`<a class="dropdown-item" href="#"></a>`);
                        e.data('id', g.id);
                        e.data('request', 'play');
                        e.text(g.name);
                        e.click(v => {
                            wsClient.send({msg: 'play', id: e.data('id')});
                            //location.hash = `play-${e.data('id')}`;
                            // v.preventDefault();
                        });
                        $('#play-list-div').append(e);
                        if (a.length !== i + 1) {
                            $('#play-list-div').append($(`<div class="dropdown-divider"></div>`));
                        }
                    });
                    $('#edit-rc-list-div').empty();
                    data.games.forEach((g, i, a) => {
                        let e = $(`<a class="dropdown-item" href="#"></a>`);
                        e.data('id', g.id);
                        e.data('request', 'edit-rc');
                        e.text(g.name);
                        e.click(v => {
                            wsClient.send({msg: 'get_rc', id: e.data('id')});
                        });
                        $('#edit-rc-list-div').append(e);
                        if (a.length !== i + 1) {
                            $('#edit-rc-list-div').append($(`<div class="dropdown-divider"></div>`));
                        }
                    });
                    break;
                case 'get_rc_response':
                    this.setEditRCTitle(`Edit RC - ${data.name} (${data.id})`);
                    this.setEditRCText(data.rcText);
                    this.showEditRCModal(true);
                    $('#save-edit-rc-btn').off('click').on('click', e => {
                        wsClient.send({msg: 'save_rc', rcText: $('#edit-rc-text').val(), id: data.id});
                    });
                    break;
                case 'save_rc_success':
                    this.showEditRCModal(false);
                    break;
                case 'lobby':
                    status = 'lobby';
                    location.hash = 'lobby';
                    this.extendMode(false);
                    this.clearMainContent();
                    this.showTileContent(false);
                    this.clearTileContent();
                    this.showGameList(true);
                    this.showGameContent(false);
                    data.gameList.forEach(g => this.appendGameTr(g));
                    break;
                case 'play':
                    status = 'play';
                    location.hash = `play-${data.id}`;
                    this.setLoading("Loading...")
                    break;
                case 'set_tile':
                    this.showTileContent(false);
                    let tileData;
                    if (data.dataPath) {
                        tileData = await fetch(data.dataPath).then(r => r.json());
                    } else {
                        tileData = data.tileData;
                    }
                    this.tileRenderer = new TileRenderer(data.filePath, tileData);
                    this.tileRenderer.init();
                    // TODO: Delete
                    self.tileRenderer = this.tileRenderer;
                    break;
                case 'lobby_add':
                    this.updateAllGameTr();
                    this.appendGameTr(data);
                    break;
                case 'lobby_remove':
                    console.log('REMOVE', data);
                    this.removeGameTr(data);
                    break;
                case 'game_close_wait':
                    this.setLoadingText('Another game session saving...');
                    break;
                case'watch':
                    location.hash = `watch-${data.username}`;
                    this.setLoading("Loading...");
                    status = 'watch';

                    break;
                case 'init_watch':
                    this.loadingQueue = [];
                    setTimeout(async _ => {
                        await waitFor(_ => this.tileRenderer.initEnd, 0);
                        this.clearLoading();
                        this.showTileContent(true);
                        this.showGameContent(true);
                        let queue = this.loadingQueue;
                        this.loadingQueue = void 0;
                        let tData = data.playData.tile;
                        for (let i in tData) {
                            i = parseInt(i);
                            this.tileRenderer.drawTileByData({i, t: tData[i].t});
                        }
                        console.log('status', data.playData.status)
                        update_status(data.playData.status);
                        queue = [{msg: 'text', list: data.playData.text}, ...queue];
                        queue.forEach(d => wsClient.handler(d, socket));
                    }, 1000);
                    break;

                case 'init_game':
                    this.loadingQueue = [];
                    setTimeout(async _ => {
                        await waitFor(_ => this.tileRenderer.initEnd, 0);
                        this.clearLoading();
                        wsClient.send({msg: 'key', keyCode: 32});
                        this.showTileContent(true);
                        this.showGameContent(true);
                        let queue = this.loadingQueue;
                        this.loadingQueue = void 0;
                        queue.forEach(d => wsClient.handler(d, socket));


                        $('body').off('keypress');
                        $('body').off('keydown');

                        $('body').keypress(e => {
                            if ($('#chat_input:focus').length > 0) {
                                //e.preventDefault();
                                return;
                            }
                            var code = e.charCode || e.keyCode;
                            console.log(code);
                            if (code == 39) {
                                $('#chat_input').focus();
                                e.preventDefault();
                                return;
                            }
                            // S-space: toggle zoom
                            if ((code == 32) && (e.shiftKey) && !(e.ctrlKey || e.altKey || e.metaKey)) {
                                //nethack.btn_toggle_zoom.click();
                            } else {
                                if (e.ctrlKey)
                                    return; // should have been processed in keydown
                                $('#key-ui').text(`keyCode: ${code}`);
                                wsClient.send({
                                    msg: 'key',
                                    keyCode: code
                                });
                            }
                        });
                        $('body').keydown(e => {
                            if ($('#chat_input:focus').length > 0) {
                                //e.preventDefault();
                                return;
                            }
                            if (e.keyCode == 27) {
                                $('#item-content').hide();
                                $('.more').remove();
                                $('#key-ui').text(`keyCode: ${e.keyCode}`);
                                wsClient.send({
                                    msg: 'key',
                                    keyCode: e.keyCode
                                });
                                return;
                            }
                            if (!e.ctrlKey)
                                return; // key events without ctrl is handled in `keypress` events
                            if (e.keyCode == 17)
                                return; // ctrl is pressed down
                            e.preventDefault();
                            var code = e.charCode || e.keyCode;
                            // some browsers do not `apply` the control key to charCode
                            if ((code >= 65) && (code <= 90)) { // A~Z
                                code = code - 64;
                            } else if ((code >= 97) && (code <= 122)) {
                                code = code - 96;
                            }
                            console.log(code);
                            if (code == 39) {
                                $('#chat_input').focus();
                                e.preventDefault();
                                return;
                            }
                            $('#key-ui').text(`keyCode: ${code}`);
                            wsClient.send({
                                msg: 'key',
                                keyCode: code
                            });
                        });

                    }, 1000);
                    break;
                case 'tile':
                    // 임시
                    $('.more').remove();
                    $('#item-content').hide();
                    let tData = data.data;
                    for (let i in tData) {
                        i = parseInt(i);
                        this.tileRenderer.drawTileByData({i, t: tData[i].t});
                    }
                    break;
                case 'clear_tile':
                    this.tileRenderer.clearTile();
                    break;
                case 'status':
                    statusData = {...statusData, ...data.data};
                    console.log('STATUSDATA', statusData);
                    update_status(statusData);
                    break;
                case 'text':
                    $('#item-content').hide();
                    $('.more').remove();
                    if (data.list.length > 10 && status == 'play') {
                        alert(data.list.join('\n'));
                        break;
                    }
                    data.list.forEach(t => {
                        let textSpan = $('<span>');
                        textSpan.addClass('ingame-text');
                        textSpan.text(t);
                        $('#message-content').append(textSpan);
                    });
                    resizeMessageContent();
                    break;
                case 'more':
                    let textSpan = $('<span>');
                    textSpan.addClass('ingame-text');
                    textSpan.addClass('more');
                    textSpan.css('background-color', 'maroon');
                    textSpan.text(data.prompt);
                    $('#message-content').append(textSpan);
                    resizeMessageContent();
                    break;
                case 'inventory':
                    $('#item-content').empty();
                    $('#item-content').append(data.items.map(e => {
                        let l = $('<span>');
                        l.text(e.item);
                        return [l, $('<br>')];
                    }).flat());
                    $('#item-content').show();
                    break;
                case 'chat_msg':
                    data.username = data.isPublic ? '§' + data.username : data.username;
                    system_chat(data.username, data.text);
                    break;
            }


        }
        $(window).resize(_ => {
            resizeMessageContent();
        })
    }
}

export default new UIHandler();
