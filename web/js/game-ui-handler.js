class GameUIHandler {
    constructor(sender, config) {
        this.sender = sender;
        this.config = config;
        window.G = this;
    }
	applyFontPatch() {
		if (typeof fontStyle === 'undefined') {
			let WebFontConfig = {
				custom : {
					families : ['Nanum Gothic Coding'],
					urls : ['http://fonts.googleapis.com/earlyaccess/nanumgothiccoding.css']
				}
			};
			(function () {
				var wf = document.createElement('script');
				wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
				'://ajax.googleapis.com/ajax/libs/webfont/1.4.10/webfont.js';
				wf.type = 'text/javascript';
				wf.async = 'true';
				var s = document.getElementsByTagName('script')[0];
				s.parentNode.insertBefore(wf, s);
			})();
			var fontStyle = document.createElement("style");
			fontStyle.setAttribute("id", "font_style_apply");
			fontStyle.appendChild(document.createTextNode(
					'* {font-family: "Nanum Gothic Coding", monospace;}'));
			document.getElementsByTagName("head")[0].appendChild(fontStyle);
		}
	}
	disapplyFontPatch() {
		var font_tag = $('#font_style_apply');
		if (font_tag) {
			font_tag.remove();
		}
	}
    clearTerminal() {
        if (this.terminal) {
            this.terminal.dispose();
        }
    }

    openTerminal() {
        this.terminal.open($('#terminal-content').get(0));
    }

    initTileRenderer(filePath, tileData, eventHandlerMap) {
        this.tileRenderer = new TileRenderer(filePath, tileData, eventHandlerMap);
        this.tileRenderer.init();
    }

    clearKeyHandler() {
        $('body').off('keypress');
        $('body').off('keydown');
    }

    close_more() {
        $('.more').remove();
        $('#item-content').hide();
    }

    close_sharp_input() {
        $('.sharp_input').remove();
    }

    addText(list) {
        list.forEach(t => {
            let textSpan = $('<span>');
            textSpan.addClass('ingame-text');
            textSpan.text(t);
            $('#message-content').append(textSpan);
        });
        let messages = $('#message-content .ingame-text:not(.more)').toArray().reverse().slice(100).forEach(e=>$(e).remove());
        $('#message-content').scrollTop($('#message-content').prop('scrollHeight'));
    }

    initResizeMessageHandler() {
        /*$(window).resize(_ => {
            this.resizeMessageContent();
        })*/
    }

    more(prompt) {
        let textSpan = $('<span>');
        textSpan.addClass('ingame-text');
        textSpan.addClass('more');
        textSpan.css('background-color', 'maroon');
        textSpan.text(prompt);
        $('#message-content').append(textSpan);
        $('#message-content').scrollTop($('#message-content').prop('scrollHeight'));
        window.G = this;
    }

    sharp_input(text) {
        let sharpInput = $('.sharp_input');
        if(sharpInput.length == 0){
            let textSpan = $('<span>');
            textSpan.addClass('ingame-text');
            textSpan.addClass('sharp_input');
            textSpan.css('background-color', 'rgb(40, 80, 84)');
            textSpan.text(text);
            $('#message-content').append(textSpan);
        }else{
            sharpInput.text(text);
        }
        $('#message-content').scrollTop($('#message-content').prop('scrollHeight'));
    }

        renderInventory(items) {
        $('#item-content').empty();
        $('#item-content').append(items.map(e => {
            let l = $('<span>');
            l.text(e.item);
            return [l, $('<br>')];
        }).flat());
        $('#item-content').show();
    }

    // TODO FIX CALC
    resizeMessageContent() {


/*        let leftHeight = $('body').height() - $('#browserhack-status').height() - $('#tile-content').height();
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
        }*/
    }

    initKeyHandler() {
        this.clearKeyHandler();
        $('#tile-content, #terminal-content').click(e=>{document.activeElement.blur();});
        $('body').keypress(e => {
            if(this.menuMode && 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ<>'.includes(e.key)){
                if(e.key === '>'){
                    $('.menu').scrollTop($('.menu').scrollTop()+$('.menu').height());
                    return;
                }else if(e.key === '<'){
                    $('.menu').scrollTop($('.menu').scrollTop()-$('.menu').height());
                    return;
                }
                let menuScroll = $('.menu').scrollTop();
                let selected = [...$('.item').toArray().filter(x => x.offsetTop >= menuScroll).slice(0, 52), ...$('.item').toArray().filter(x => x.offsetTop < menuScroll).reverse()].find(l=>$(l).data('selector') == e.key);
                if(selected){
                    selected = $(selected);
                    if(typeof selected.data('selectIndex') === 'number'){
                        this.sender.selectIndex(selected.data('selectIndex'));
                    }else if(selected.data('selector')){
                        this.sender.key(selected.data('selector').charCodeAt(0));
                    }
                }
                return;
            }
            if ($('#chat_input:focus').length > 0) {
                //e.preventDefault();
                return;
            }
            var code = e.charCode || e.keyCode;
            // console.log(code);

            // S-space: toggle zoom
            if ((code == 32) && (e.shiftKey) && !(e.ctrlKey || e.altKey || e.metaKey)) {
                //nethack.btn_toggle_zoom.click();
            } else {
                if (e.ctrlKey)
                    return; // should have been processed in keydown
                $('#key-ui').text(`keyCode: ${code}`);

                this.sender.key(code);
            }
        });
        let zoomArray = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 0.1, 0.2, 0.3, 0.5, 0.6, 0.8];
        $('body').keydown(e => {
            if(e.key === 'F8' || e.key === 'F9' || e.key === 'F10' || e.key === 'F12'){
                if(!this.zoomStatusIndex){
                    this.zoomStatusIndex = 0;
                }
                if(!this.terminalStatus){
                    this.terminalStatus = 'on';
                }
                if(e.key == 'F8'){
                    if(this.terminalStatus == 'on'){
                        $('#terminal-content').css('opacity', 0.7);
                        this.terminalStatus = 'alpha';
                    }else if(this.terminalStatus == 'alpha'){
                        $('#terminal-content').hide();
                        this.terminalStatus = 'off';
                    }else if(this.terminalStatus == 'off'){
                        $('#terminal-content').css('opacity', 1);
                        $('#terminal-content').show();
                        this.terminalStatus = 'on';
                    }
                }else if(e.key == 'F9'){
                    this.zoomStatusIndex--;
                    if(this.zoomStatusIndex % zoomArray.length < 0){
                        this.zoomStatusIndex += zoomArray.length;
                    }
                    this.tileRenderer.setZoom(zoomArray[this.zoomStatusIndex]);
                }else if(e.key == 'F10'){
                    this.zoomStatusIndex++;
                    this.zoomStatusIndex %= zoomArray.length;
                    this.tileRenderer.setZoom(zoomArray[this.zoomStatusIndex]);
                }else if(e.key == 'F12'){
                    $('#chat_input').focus();
                }
                e.preventDefault();
                return;
            }
            if ($('#chat_input:focus').length > 0) {
                //e.preventDefault();
                return;
            }
            if (e.keyCode == 27) {
                $('#item-content').hide();
                $('.more').remove();
                //$('#key-ui').text(`keyCode: ${e.keyCode}`);

                this.sender.key(e.keyCode);
                return;
            } else if (e.keyCode === 32) {
                $('#item-content').hide();
                $('.more').remove();
            } else if (e.keyCode === 8) {
                this.sender.key(e.keyCode);
                return;
            }


            var code = e.charCode || e.keyCode;
            // some browsers do not `apply` the control key to charCode
            if ((code >= 65) && (code <= 90)) { // A~Z
                code = code - 64;
            } else if ((code >= 97) && (code <= 122)) {
                code = code - 96;
            }

            if(e.keyCode == 18){
                return;
            }

            if(e.altKey){
                if(e.keyCode == 16){ // ignore duplicated input 'alt +shift'
                    return;
                }

                if(e.shiftKey){
                    code -= 32; // to uppercase
                }

                code += 96;
                this.sender.key(code | 0x80);
                return;
            }

            if (!e.ctrlKey)
                return; // key events without ctrl is handled in `keypress` events
            if (e.keyCode == 17)
                return; // ctrl is pressed down
            e.preventDefault();
            // console.log(code);
            if (code == 39) {
                $('#chat_input').focus();
                e.preventDefault();
                return;
            }
            // $('#key-ui').text(`keyCode: ${code}`);
            this.sender.key(code);
        });
    }


    drawTile(tData) {
        for (let i in tData) {
            i = parseInt(i);
            this.tileRenderer.drawTileByData({i, t: tData[i].t, f: tData[i].f});
        }
    }

    setCursor(i) {
        this.tileRenderer.setCursor(i);
    }

    clearTile() {
        this.tileRenderer.clearTile();
    }

    async waitTileRendererInit() {
        await CoreUtils.waitFor(_ => this.isTileRendererInited(), 0);
    }

    initTerminal() {
        this.clearTerminal();
        this.terminal = new Terminal({
            fontSize: 14,
            fontFamily: 'Courier New'
        });

        // TODO WEB RC fontWeightBold: 'normal'

        this.terminal.resize(this.config.terminalCols, this.config.terminalRows);
        /*this.fitAddon = new FitAddon();
        this.terminal.loadAddon(fitAddon);*/

        this.terminal.setOption("theme", {
            background: "#202B33",
            foreground: "#F5F8FA",
        });
    }

    writeTerminal(data) {
        this.terminal.write(data);
    }

    isTileRendererInited() {
        return this.tileRenderer.initEnd;
    }

    create_highlight_element(old_value, new_value, invert) {
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

    update_status(data) {
        try{


        if (!this.statusData) {
            this.statusData = data;
        } else {
            this.statusData = {...this.statusData, ...data};
        }
        // console.log('isnot?', data)
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

        // console.log(data[13].text);
        var status1 = [1, this.statusData[0].text, "ST:", this.statusData[1].text, "DX: ", this.statusData[2].text, "CO:", this.statusData[3].text, "IN:", this.statusData[4].text, "WI:", this.statusData[5].text, "CH:", this.statusData[6].text, 15, 16, 17, 18, 19, this.statusData[7].text].map(e => e + '');
        // console.log(data[8].text);
        var status2 = [21, this.statusData[20].text, 23, 24, this.statusData[18].text, 26, this.statusData[19].text, 28, 29, this.statusData[11].text, 31, this.statusData[12].text, 33, 34, this.statusData[14].text, 36, this.statusData[13].text, 38, [this.statusData[9].text, this.statusData[17].text].filter(e => e !== "").join(', '), 40].map(e => e + '');
        // console.log(status2);
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
        table.style.marginLeft = '5px';
        table.style.marginRight = '5px';
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
        var lvl = this.create_highlight_element(old_status[1][16], status2[16]);
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
        table.style.width = '390px';
        table.style.marginLeft = '5px';
        table.style.marginRight = '5px';
        table.style.marginTop = '5px';
        // HP
        tr = table.insertRow();
        td = tr.insertCell();
        td.appendChild(getProgressBar(status2[6], status2[4], 'danger', 'HP: '));
        this.tileRenderer.setMarkerColor(status2[4]/status2[6]);
        // Pw
        tr = table.insertRow();
        td = tr.insertCell();
        td.appendChild(getProgressBar(status2[11], status2[9], 'info', 'PW: '));
        win.appendChild(table);

        var statDiv =  document.createElement('div');
        // list of stats in order, for hexagon
        var stats = [];

        // next table contains stats on two rows
        table = document.createElement('table');
        table.className = 'status-table';
        table.style.marginTop = '5px';
        table.style.width = '310px';
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
            var stat = this.create_highlight_element(old_status[0][i + 1], status1[i + 1]);
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
        statDiv.appendChild(table);

        // canvas for stat hexagon
        var canvas = document.createElement('canvas');
        var w = 56;
        var r = w / 2;
        canvas.className = 'status-table';
        canvas.width = w;
        canvas.height = w;
        var ctx = canvas.getContext('2d');
        statDiv.appendChild(canvas);
        win.appendChild(statDiv);
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
        var lastStatus =  document.createElement('div');
        lastStatus.style.textAlign = 'center';
        var dlvl = document.createElement('i');
        dlvl.classList.add('fa', 'fa-compass', 'status-misc');
        dlvl.innerHTML = ' ' + status2[1].split(':')[1].split(' ')[0];
        lastStatus.appendChild(dlvl);
        // No turn in current status lines?
        /*
        var turn = document.createElement('i');
        turn.classList.add('fa', 'fa-hourglass-half', 'status-misc');
        turn.innerHTML = ' ' + '0';
        win.appendChild(turn);
        */
        var ac = document.createElement('i');
        ac.classList.add('fa', 'fa-shield', 'status-misc');
        ac.innerHTML = ' ' + outerHTML(this.create_highlight_element(old_status[1][14], status2[14], true));
        lastStatus.appendChild(ac);
        var gold = document.createElement('i');
        gold.classList.add('fa', 'fa-usd', 'status-misc');
        gold.innerHTML = ' ' + outerHTML(this.create_highlight_element(this.statusData[10].text.split(':').pop(), this.statusData[10].text.split(':').pop()));
        lastStatus.appendChild(gold);
        win.appendChild(lastStatus);
        // update old status to current
        //old_status = [status1, status2];
        }catch(e){
            console.error(e);
        }
    }

    launchLargeTextPopup(text) {
      $('.text-popup-content').text(text);
      // document.getElementById('popup-content').innerHTML = text;
      $('#ui-popup').show();
      $('.text-popup-content').scrollTop(0);
    }

    closePopup(){
      const popup = document.getElementById('ui-popup');
      document.getElementById('ui-popup').style.display = "none";
    }

    updateMenu(menuData){
        $('.item:has(.item-selectable)').toArray().map(e=>$(e)).forEach((e, i)=>{
            let text = e.find('.item-selectable').text().split('');
            let currentData = menuData[i];
            if (e.data('selected') != currentData.selected || e.data('count') != currentData.count){
                text[2] = !currentData.selected ? '-' : (currentData.count != -1 ? '#' : '+');
                e.data('selected', currentData.selected);
                e.data('count', currentData.count);
                e.find('.item-selectable').text(text.join(''));
            }
        });
        // console.log(menuData);
    }

    createMenu(menuData) {
        this.menuMode = true;
        const menu = $('#menu');
        let selectorString = 'abcdefghijklnmopqrstuvwxyzABCDEFGHIJKLNMOPQRSTUVWXYZ';
        let selectorIndex = 0;
        for(let data of menuData){
            if(data.o_str === ''){
                data.o_str += '　';
            }
            if(!data.a_void){
                if(data.attr === 7){
                    const itemHeader = $("<div/>").attr({
                        "class" : "item-header"
                    }).text(data.o_str);
                    menu.append(itemHeader);
                }else{
                    // text element
                    const textMenu = $("<div/>").attr({
                        "class" : "menu-header"
                    });
                    textMenu.text(data.o_str);
                    menu.append(textMenu);
                }
            }else{
                if(data.attr === 7){
                    const itemHeader = $("<div/>").attr({
                        "class" : "item-header"
                    }).text(data.o_str);
                    menu.append(itemHeader);
                }else {
                  const item = $("<div/>").attr({
                    "class" : "item"
                });
                if(data.tile >= 0){
                    const itemTile = $(this.tileRenderer.getTileCanvas(data.tile)).attr({
                        "class" : "item-tile item-col"
                    });
                    item.append(itemTile);
                    const emptyDiv = $('<div class="item-text"> </div>');
                    item.append(emptyDiv);
                }
                let selector = data.ch ? data.ch : selectorString.charAt(selectorIndex % 52);
                const itemText = $("<div/>").attr({
                    "class" : "item-text item-col item-selectable"
                }).text(`${selector} ${!data.selected ? '-' : (data.count != -1 ? '#' : '+')} ${data.o_str}`);
                    item.data('selected', data.selected);
                    item.data('count', data.count);
                    item.data('selector', selector);
                    !data.ch ? item.data('selectIndex', selectorIndex) : item.data('selectIndex', null);

                selectorIndex++;
                item.click(e=>{
                    e = $(e.currentTarget);
                    if(typeof e.data('selectIndex') === 'number'){
                        this.sender.selectIndex(e.data('selectIndex'));
                    }else if(e.data('selector')){
                        this.sender.key(e.data('selector').charCodeAt(0));
                    }
                });
                item.append(itemText);
                if(data.tile >= 0){
                    let description = data.o_str;
                    let r = description.split(/^(a|an|\d+)\s+/);

                    let count = 1;
                    if(r.length == 3) {
                        description = r[2];
                        count = parseInt(r[1]) || 1;
                    }
                    // parse BCU
                    let bcu = null;
                    r = description.split(/^(blessed|uncursed|cursed)\s+/);
                    if(r.length == 3) {
                        description = r[2];
                        bcu = r[1];
                    }
                    if(bcu === null){
                        bcu = 'item-default';
                    }else{
                        bcu = 'item-'+bcu;
                    }
                    itemText.addClass(bcu);
                }
                menu.append(item);
                }
            }
        }
        $('#ui-menu').show();
        menu.scrollTop(0);
    }

    closeMenu() {
      this.menuMode = false;
      const $menu = $('#menu');
      $menu.html('');
      $('#ui-menu').hide();
    }

    draw(canvas, x, y) {
      const image = new Image();
      const ctx = canvas.getContext("2d");
      image.src = "./tileset/nh366/Nevanda-32x32-Raw.png";
      const w = 32;

      ctx.canvas.width = w;
      ctx.canvas.height = w;
      return (image.onload = function () {
        ctx.drawImage(image, x * 32, y * 32, w, w, 0, 0, w, w);
      });
    }



}

export default GameUIHandler;
