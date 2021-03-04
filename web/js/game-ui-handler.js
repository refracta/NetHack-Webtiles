class GameUIHandler {
    constructor(sender, config) {
        this.sender = sender;
        this.config = config;
        window.G = this;
        this.isMobile = navigator.userAgent.match(/Android|Mobile|iP(hone|od|ad)|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/)
        this.messageContent = this.isMobile ?  $('#mobile-message-content') : $('#message-content');
    }
    clearMobileButton(){
        $('#mobile-button-ui').html('');
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
        this.tileRenderer = new TileRenderer(filePath, tileData, eventHandlerMap, this.isMobile);
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
        $('.sharp-container').remove();
    }

    addText(list) {
        list.forEach(t => {
            let textSpan = $('<span>');
            textSpan.addClass('ingame-text');
            if(this.isMobile){
                textSpan.css('white-space', 'normal');
                textSpan.css('word-break', 'break-word');
            }
            textSpan.text(t);
            this.messageContent.append(textSpan);
        });
        let messages = $('#message-content .ingame-text:not(.more)').toArray().reverse().slice(100).forEach(e=>$(e).remove());
        this.messageContent.scrollTop(this.messageContent.prop('scrollHeight'));
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
        this.messageContent.append(textSpan);
        this.messageContent.scrollTop(this.messageContent.prop('scrollHeight'));
        window.G = this;
    }
    sharp_autocomplete(autocomplete){
        $('.sharp_autocomplete').text(autocomplete);
    }

    sharp_input(text) {
        let sharpInput = $('.sharp_input');
        if(sharpInput.length == 0){
            let div = $('<div>');
            div.addClass('sharp-container');
            div.addClass('ingame-text');
            div.css('background-color', 'rgb(40, 80, 84)');
            let sharpInput = $('<span>');
            sharpInput.addClass('sharp_input');
            sharpInput.text(text);
            div.append(sharpInput);
            let sharpAutoComplete = $('<span>');
            sharpAutoComplete.addClass('sharp_autocomplete');
            div.append(sharpAutoComplete);
            if(this.isMobile){
                sharpInput.css('white-space', 'normal');
                sharpInput.css('word-break', 'break-word');
                sharpAutoComplete.css('white-space', 'normal');
                sharpAutoComplete.css('word-break', 'break-word');
            }
            this.messageContent.append(div);
        }else{
            sharpInput.text(text);
            this.sharp_autocomplete('');
        }
        this.messageContent.scrollTop(this.messageContent.prop('scrollHeight'));
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
    applyMobileInterface() {

        $('#status-content').hide();
        $('.ui-popup-outer').css('overflow-x', 'auto');
        $('#mobile-ui').show();
        $('#chat').hide();

        // this.messageContent.css('background', 'transparent');
        // this.messageContent.css('padding-left', '0');
        $('#message-content').hide();
       /* setInterval(_=>{
            this.sender.key(27);
        }, 1000);*/
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
            }else if(this.textMode){
                if(e.key === '>'){
                    $('.ui-popup-outer').scrollTop($('.ui-popup-outer').scrollTop()+$('.ui-popup-outer').height());
                    return;
                }else if(e.key === '<'){
                    $('.ui-popup-outer').scrollTop($('.ui-popup-outer').scrollTop()-$('.ui-popup-outer').height());
                    return;
                }
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
        if(!this.terminalStatus){
            this.terminalStatus = 'off';
            $('#terminal-content').hide();
        }
        $(document).off('contextmenu').on('contextmenu', function(e) {
            if($('#tile-content > canvas')[0] == e.target){
                e.preventDefault();
            }
        });
        let zoomArray = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 0.1, 0.2, 0.3, 0.5, 0.6, 0.8].map(e=>window.devicePixelRatio*e);
        $('body').keydown(e => {
            if(e.key === 'F8' || e.key === 'F9' || e.key === 'F10' || e.key === 'F12'){
                if(!this.zoomStatusIndex){
                    this.zoomStatusIndex = 0;
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
                        $("#chat_body").slideDown(200);
                        this.new_message_count = 0;
                        //update_message_count();
                        $("#message_count").html("(Esc: back to game)");
                        $('#chat_history_container').scrollTop($('#chat_history_container')[0].scrollHeight);
                        setTimeout(_=>{
                            $('#built-in-inventory').css('height', `calc(100vh - ${($('#browserhack-status').height() + 10)}px - ${($('#chat').height() + 12) + 'px'})`);
                        },300);
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

    create_highlight_element(value) {
        var ele = document.createElement('span');
        ele.textContent = value;
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

    parseStatusData(data){
        const TITLE_INDEX = 0;
        const ST_INDEX = 1;
        const DX_INDEX = 2;
        const CO_INDEX = 3;
        const IN_INDEX = 4;
        const WI_INDEX = 5;
        const CH_INDEX = 6;
        const ALIGNMENT_INDEX = 7;
        const ENCUMBRANCE_INDEX = 9;
        const GOLD_INDEX = 10;
        const PW_INDEX = 11;
        const MAX_PW_INDEX = 12;
        const LEVEL_INDEX = 13;
        const AC_INDEX = 14;
        const TURN_INDEX = 16;
        const HUNGER_INDEX = 17;
        const HP_INDEX = 18;
        const MAX_HP_INDEX = 19;
        const LOCATION_INDEX = 20;
        const XP_INDEX = 21;
        const CONDITION_INDEX = 22;
        let obj = {};
        data[TITLE_INDEX] ? obj.title = {value: data[TITLE_INDEX].text, color: data[TITLE_INDEX].color, attr: data[TITLE_INDEX].attr} : void 0;
        data[ST_INDEX] ? obj.st = {value: data[ST_INDEX].text, color: data[ST_INDEX].color, attr: data[ST_INDEX].attr} : void 0;
        data[DX_INDEX] ? obj.dx = {value: data[DX_INDEX].text, color: data[DX_INDEX].color, attr: data[DX_INDEX].attr} : void 0;
        data[CO_INDEX] ? obj.co = {value: data[CO_INDEX].text, color: data[CO_INDEX].color, attr: data[CO_INDEX].attr} : void 0;
        data[IN_INDEX] ? obj.in = {value: data[IN_INDEX].text, color: data[IN_INDEX].color, attr: data[IN_INDEX].attr} : void 0;
        data[WI_INDEX] ? obj.wi = {value: data[WI_INDEX].text, color: data[WI_INDEX].color, attr: data[WI_INDEX].attr} : void 0;
        data[CH_INDEX] ? obj.ch =  {value: data[CH_INDEX].text, color: data[CH_INDEX].color, attr: data[CH_INDEX].attr} : void 0;
            data[ENCUMBRANCE_INDEX] ? obj.encumbrance = {value: data[ENCUMBRANCE_INDEX].text, color: data[ENCUMBRANCE_INDEX].color, attr: data[ENCUMBRANCE_INDEX].attr} : void 0;
            data[HUNGER_INDEX] ? obj.hunger = {value: data[HUNGER_INDEX].text, color: data[HUNGER_INDEX].color, attr: data[HUNGER_INDEX].attr} : void 0;
            data[ALIGNMENT_INDEX] ? obj.alignment = {value: data[ALIGNMENT_INDEX].text, color: data[ALIGNMENT_INDEX].color, attr: data[ALIGNMENT_INDEX].attr} : void 0;
            data[GOLD_INDEX] ? obj.gold = {value: parseInt(data[GOLD_INDEX].text.split(':').pop())} : void 0;
            data[PW_INDEX] ? obj.pw = {value: parseInt(data[PW_INDEX].text), color: data[PW_INDEX].color, attr: data[PW_INDEX].attr} : void 0;
            data[MAX_PW_INDEX] ? obj.maxPW = {value: parseInt(data[MAX_PW_INDEX].text), color: data[MAX_PW_INDEX].color, attr: data[MAX_PW_INDEX].attr} : void 0;
            data[HP_INDEX] ? obj.hp = {value: parseInt(data[HP_INDEX].text), color: data[HP_INDEX].color, attr: data[HP_INDEX].attr} : void 0;
            data[MAX_HP_INDEX] ? obj.maxHP = {value: parseInt(data[MAX_HP_INDEX].text), color: data[MAX_HP_INDEX].color, attr: data[MAX_HP_INDEX].attr} : void 0;
            data[AC_INDEX] ? obj.ac = {value: parseInt(data[AC_INDEX].text), color: data[AC_INDEX].color, attr: data[AC_INDEX].attr} : void 0;
            data[LEVEL_INDEX] ? obj.level = {value: parseInt(data[LEVEL_INDEX].text), color: data[LEVEL_INDEX].color, attr: data[LEVEL_INDEX  ].attr} : void 0;
            data[TURN_INDEX] ? obj.turn = {value: parseInt(data[TURN_INDEX].text), color: data[TURN_INDEX].color, attr: data[TURN_INDEX].attr} : void 0;
            data[XP_INDEX] ? obj.xp = {value: parseInt(data[XP_INDEX].text), color: data[XP_INDEX].color, attr: data[XP_INDEX].attr} : void 0;
            data[LOCATION_INDEX] ? obj.location = {value: data[LOCATION_INDEX].text, color: data[LOCATION_INDEX].color, attr: data[LOCATION_INDEX].attr} : void 0;
            data[CONDITION_INDEX] ? obj.condition = {value: data[CONDITION_INDEX].condition_list} : void 0;
        return obj;
    }
    create_text_element(text, color, attr, colorOverride, type = 'hl'){
        color = color & 0x00FF;
        let terminalColor = {
            "name" : "Campbell",

            "cursorColor": "#FFFFFF",
            "selectionBackground": "#FFFFFF",

            "background" : "#0C0C0C",
            "foreground" : "#CCCCCC",
            "pureWhite" : "#ffffff",

            "black" : "#0C0C0C",
            "blue" : "#0037DA",
            "cyan" : "#3A96DD",
            "green" : "#13A10E",
            "purple" : "#881798",
            "red" : "#C50F1F",
            "white" : "#CCCCCC",
            "yellow" : "#C19C00",
            "brightBlack" : "#767676",
            "brightBlue" : "#3B78FF",
            "brightCyan" : "#61D6D6",
            "brightGreen" : "#16C60C",
            "brightPurple" : "#B4009E",
            "brightRed" : "#E74856",
            "brightWhite" : "#F2F2F2",
            "brightYellow" : "#F9F1A5"
        };
        terminalColor = {...terminalColor, ...colorOverride};
        const colorOrder = ["black", "red", "green", "yellow", "blue", "purple", "cyan", "white", "brightBlack", "brightRed", "brightGreen", "brightYellow", "brightBlue","brightPurple","brightCyan","brightWhite"];
        const ATR_NONE = 0;
        const ATR_BOLD = 1;
        const ATR_DIM = 2;
        const ATR_ULINE = 4;
        const ATR_BLINK = 5;
        const ATR_INVERSE = 7;

        const HL_UNDEF   = 0x00;
        const HL_NONE    = 0x01;
        const HL_BOLD    = 0x02;
        const HL_INVERSE = 0x04;
        const HL_ULINE   = 0x08;
        const HL_BLINK   = 0x10;
        const HL_DIM     = 0x20;

        let realColor = terminalColor[colorOrder[color]];

        let outerSpan = $('<span/>');
        let innerSpan = $('<span/>');
        outerSpan.append(innerSpan);
        innerSpan.text(text);
        innerSpan.css('color', realColor);

        if(type == 'hl'){
            if(attr & HL_NONE){

            }
            if(attr & HL_NONE){
                outerSpan.addClass('console-effect-none');
            }
            if(attr & HL_BOLD){
                outerSpan.addClass('console-effect-bold');
            }
            if(attr & HL_DIM){
                outerSpan.addClass('console-effect-dim');
            }
            if(attr & HL_ULINE){
                outerSpan.addClass('console-effect-uline');
            }
            if(attr & HL_BLINK){
                outerSpan.addClass('console-effect-blink');
            }
            if(attr & HL_INVERSE){
                outerSpan.css('background', realColor);
                innerSpan.css('color', terminalColor.background);
            }
        }else if(type =='atr'){
            switch (attr){
                case ATR_BOLD:
                    outerSpan.addClass('console-effect-bold');
                    break;
                case ATR_DIM:
                    outerSpan.addClass('console-effect-dim');
                    break;
                case ATR_ULINE:
                    outerSpan.addClass('console-effect-uline');
                    break;
                case ATR_BLINK:
                    outerSpan.addClass('console-effect-blink');
                    break;
                case ATR_INVERSE:
                    outerSpan.css('background', realColor);
                    innerSpan.css('color', terminalColor.background);
                    break;
            }
        }


       return outerSpan.get(0);
    }

    start_yn_function(){
        $('.ingame-text:nth-last-child(1)').css('background-color', '#2198e7');
    }
    end_yn_function(){
        $('.ingame-text:nth-last-child(1)').css('background-color', '');
    }

    update_status(data) {

        try{
        if (!this.statusData) {
            this.statusData = data;
        } else {
            this.statusData = {...this.statusData, ...data};
        }
        let status = this.parseStatusData(this.statusData);

        if(this.isMobile){
            let mobileStatus = $('#mobile-status');
            let overrideColor = {brightBlack: '#dddddd', black: '#dddddd'};
            mobileStatus.html('');
            let statusLine1 =  $('<span>');
            statusLine1.append(this.create_text_element(status.title.value, status.title.color, status.title.attr, overrideColor));
            statusLine1.append(this.create_text_element(`St:${status.st.value}`, status.st.color, status.st.attr, overrideColor));
            statusLine1.append($('<span> </span>'));
            statusLine1.append(this.create_text_element(`Dt:${status.dx.value}`, status.dx.color, status.dx.attr, overrideColor));
            statusLine1.append($('<span> </span>'));
            statusLine1.append(this.create_text_element(`Co:${status.co.value}`, status.co.color, status.co.attr, overrideColor));
            statusLine1.append($('<span> </span>'));
            statusLine1.append(this.create_text_element(`In:${status.in.value}`, status.in.color, status.in.attr, overrideColor));
            statusLine1.append($('<span> </span>'));
            statusLine1.append(this.create_text_element(`Wi:${status.wi.value}`, status.wi.color, status.wi.attr, overrideColor));
            statusLine1.append($('<span> </span>'));
            statusLine1.append(this.create_text_element(`Ch:${status.ch.value}`, status.ch.color, status.ch.attr, overrideColor));
            statusLine1.append($('<span> </span>'));
            statusLine1.append(this.create_text_element(status.alignment.value, status.alignment.color, status.alignment.attr, overrideColor));
            mobileStatus.append(statusLine1);
            mobileStatus.append("<br>")
            let statusLine2 =  $('<span>');
            statusLine2.append(this.create_text_element(status.location.value.trim(), status.location.color, status.location.attr, overrideColor));
            statusLine2.append($('<span> </span>'));
            statusLine2.append(this.create_text_element(`$:${status.gold.value}`, status.gold.color, status.gold.attr, {overrideColor, ...{black:'yellow'}}));
            statusLine2.append($('<span> </span>'));
            statusLine2.append(this.create_text_element(`HP:${status.hp.value}`, status.hp.color, status.hp.attr, overrideColor));
            statusLine2.append(this.create_text_element(`(${status.maxHP.value})`, status.maxHP.color, status.maxHP.attr, overrideColor));
            statusLine2.append($('<span> </span>'));
            statusLine2.append(this.create_text_element(`PW:${status.pw.value}`, status.pw.color, status.pw.attr, overrideColor));
            statusLine2.append(this.create_text_element(`(${status.maxPW.value})`, status.maxPW.color, status.maxPW.attr, overrideColor));

            statusLine2.append($('<span> </span>'));
            statusLine2.append(this.create_text_element(`AC:${status.ac.value}`, status.ac.color, status.ac.attr, overrideColor));
            statusLine2.append($('<span> </span>'));
            statusLine2.append(this.create_text_element(`XP:${status.level.value}`, status.level.color, status.level.attr, overrideColor));
            if(status.xp){
                statusLine2.append(this.create_text_element(`/${status.xp.value}`, status.xp.color, status.xp.attr, overrideColor));
            }
            statusLine2.append($('<span> </span>'));
            if(status.turn){
                statusLine2.append(this.create_text_element(`T:${status.turn.value}`, status.turn.color, status.turn.attr, overrideColor));
                statusLine2.append($('<span> </span>'));
            }
            if (status.hunger.value){
                statusLine2.append(this.create_text_element(status.hunger.value.trim(), status.hunger.color, status.hunger.attr));
                statusLine2.append($('<span> </span>'));
            }
            if (status.encumbrance.value){
                statusLine2.append(this.create_text_element(status.encumbrance.value.trim(), status.encumbrance.color, status.encumbrance.attr));
                statusLine2.append($('<span> </span>'));
            }
            if (status.condition.value){
                status.condition.value.map(e=>this.create_text_element(e.condtext.trim(), e.coloridx, e.attrmask)).forEach(e=>{statusLine2.append(e);statusLine2.append($('<span> </span>'));});
            }

            mobileStatus.append(statusLine2);
          let bodyWidth = $('body').width();
          let statusLine1Size = statusLine1.css('font-size').split('px').shift();
          let statusLine2Size = statusLine1.css('font-size').split('px').shift();
            for(let i = 0; i < 10; i++){
                if(statusLine1.width() > bodyWidth){
                    statusLine1.css('font-size', (statusLine1Size-i*2)+'px');
                }else{
                    break;
                }

            }
            for(let i = 0; i < 10; i++){
                if(statusLine2.width() > bodyWidth){
                    statusLine2.css('font-size', (statusLine2Size-i*2)+'px');
                }else{
                    break;
                }
            }



            return;
        }

        // console.log(status);
        // console.log(this.statusData);
        // console.log('isnot?', data)
        var win = $('#browserhack-status')[0];

        // creates a bootstrap statusbar given a max and current value
        var getProgressBar =  (max, value, style, text) => {
            let rawMax = max;
            let rawValue = value;
            max = rawMax.value;
            value = rawValue.value;
            var percent = Math.round((1.0 * value / max) * 100);
            if(percent == Infinity){
                percent = 100;
            }
            var div = document.createElement('div');
            div.className = 'progress';
            var minHeight = style =='warning' ? 15 : 25;
            div.style.minHeight = minHeight + 'px';
            // var textColor = percent < 40 ? 'black': 'white';
            var textColor = percent < 75 ? 'black': 'white';
            div.innerHTML = '<div class="progress-bar bg-'
                + style + '" role="progressbar" aria-valuenow="'
                + value + '" aria-valuemin="0" aria-valuemax="'
                + max + `" style="width:` + percent + `%"><span style="width: 390px; position: absolute; color:${textColor};px">`
                + text + this.create_text_element(rawValue.value, rawValue.color, rawValue.attr).outerHTML + ' / ' + this.create_text_element(rawMax.value, rawMax.color, rawMax.attr, {brightBlack: textColor}).outerHTML + '</span></div>';
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


        // console.log(status2);

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
        name.textContent = status.title.value;
        td.appendChild(name);
        let defaultSize = 32;
        for(let i = 0; i < 10; i++){
            $('.name').css('font-size', (defaultSize-i*2)+'px');
            if( $('.name').width() <= 390){
                break;
            }
        }
            // level, alignment and status effects
        tr = table.insertRow();
        td = tr.insertCell();
        td.style.textAlign = 'right';
        var lvl = this.create_text_element(status.level.value, status.level.color, status.level.attr, {brightBlack: '#dddddd'});
        // status.condition.con

        var alignLvl = document.createElement('span');
        alignLvl.className = 'highlight';
        alignLvl.innerHTML = 'LV <b style="font-size:14pt;">' + outerHTML(lvl) + '</b>, ' + this.create_text_element(status.alignment.value.trim(), status.alignment.color, status.alignment.attr, {brightBlack: '#dddddd'}).outerHTML;
        if (status.hunger.value){
            alignLvl.innerHTML += ', ' + this.create_text_element(status.hunger.value.trim(), status.hunger.color, status.hunger.attr, ).outerHTML;
        }
        if (status.encumbrance.value){
            alignLvl.innerHTML += ', ' + this.create_text_element(status.encumbrance.value.trim(), status.encumbrance.color, status.encumbrance.attr).outerHTML;
        }
        if (status.condition.value){
            alignLvl.innerHTML += ', ' + status.condition.value.map(e=>this.create_text_element(e.condtext.trim(), e.coloridx, e.attrmask).outerHTML).join(', ');
        }
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
        td.appendChild(getProgressBar(status.maxHP, status.hp, 'danger', 'HP: '));
        this.tileRenderer.setMarkerColor(status.hp.value/status.maxHP.value);
        // Pw
        tr = table.insertRow();
        td = tr.insertCell();
        td.appendChild(getProgressBar(status.maxPW, status.pw, 'info', 'PW: '));
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
        let statKey = ['st', 'dx', 'co', 'in', 'wi', 'ch'];
        let statData = statKey.map(k=>status[k]);
        for (var i = 0; i < statData.length; i ++) {
            if (i == 3)
                tr = table.insertRow();
            td = tr.insertCell();
            var str = statKey[i].trim()
            var statName = document.createElement('div');
            statName.className = 'statName';
            statName.innerHTML = '<b>' + str.toUpperCase() + '</b>';
            statName.style.textAlign = 'center';
            statName.style.color = colors[i];
            td.appendChild(statName);
            var stat = this.create_text_element(statData[i].value, statData[i].color, statData[i].attr, {brightBlack: '#dddddd'});
            stat.className = 'stat';
            stat.style.display = "grid";
            stat.style.textAlign = "center";
            td.appendChild(stat);
            // store stat in list for later use in hexagon
            // we treat 18/xx as 18 for simplicity
            var statValue = statData[i].value;
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
        lastStatus.style.width = '400px';
        lastStatus.style.textAlign = 'center';

        if(status.turn){
            var turn = document.createElement('i');
            turn.classList.add('fa', 'fa-hourglass-half', 'status-misc');
            turn.innerHTML = ' ' + this.create_text_element(status.turn.value, status.turn.color, status.turn.attr, {brightBlack: '#dddddd'}).outerHTML;
            lastStatus.appendChild(turn);
        }

        var dlvl = document.createElement('i');
        dlvl.classList.add('fa', 'fa-compass', 'status-misc');
        let dlvlText;
            try{
                dlvlText = ' ' + status.location.value.split(':')[1].split(' ')[0];
            }catch(e){
                dlvlText = ' ' + status.location.value;
            }
        dlvl.innerHTML = ' ' + this.create_text_element(dlvlText, status.location.color, status.location.attr, {brightBlack: '#dddddd'}).outerHTML;
        lastStatus.appendChild(dlvl);
        // No turn in current status lines?



        var ac = document.createElement('i');
        ac.classList.add('fa', 'fa-shield', 'status-misc');
        ac.innerHTML = ' ' + this.create_text_element(status.ac.value, status.ac.color, status.ac.attr, {brightBlack: '#dddddd'}).outerHTML;
        lastStatus.appendChild(ac);
        var gold = document.createElement('i');
        gold.classList.add('fa', 'fa-usd', 'status-misc');
        gold.innerHTML = ' ' + this.create_text_element(status.gold.value, status.gold.color, status.gold.attr, {black: '#ffffff', brightBlack: '#dddddd'}).outerHTML;
        lastStatus.appendChild(gold);
        if(status.xp){
            var xp = document.createElement('i');
            xp.classList.add('fa', 'fa-etsy', 'status-misc');
            xp.innerHTML = ' ' + this.create_text_element(status.xp.value, status.xp.color, status.xp.attr, {brightBlack: '#dddddd'}).outerHTML;
            lastStatus.appendChild(xp);
        }
        win.appendChild(lastStatus);
        // update old status to current
        //old_status = [status1, status2];
        $('#built-in-inventory').css('height', `calc(100vh - ${($('#browserhack-status').height() + 10)}px - ${($('#chat').height() + 12) + 'px'})`);

        }catch(e){
            console.error(e);
        }
    }

    launchLargeTextPopup(text) {
        this.textMode = true;
        $('.text-popup-content').text(text);

        if(this.isMobile){
            $('#mobile-button-ui').hide();
            $('.ui-popup-overlay').off('click').on('click',_=>{
                this.sender.key(27);
            });
        }
        // document.getElementById('popup-content').innerHTML = text;
      $('#ui-popup').show();
      $('.text-popup-content').scrollTop(0);
    }

    closePopup(){
        if(this.isMobile){
            $('#mobile-button-ui').show();
        }
      this.textMode = false;
      const popup = document.getElementById('ui-popup');
      document.getElementById('ui-popup').style.display = "none";
    }

    updateMenu(menuData){
        $('.item:has(.item-selectable)').toArray().map(e=>$(e)).forEach((e, i)=>{
            let text = e.find('.item-selectable > span > span').text().split('');
            let currentData = menuData[i];
            if (e.data('selected') != currentData.selected || e.data('count') != currentData.count){
                text[2] = !currentData.selected ? '-' : (currentData.count != -1 ? '#' : '+');
                e.data('selected', currentData.selected);
                e.data('count', currentData.count);
                e.find('.item-selectable > span > span').text(text.join(''));
            }
        });
        // console.log(menuData);
    }
    clearBuiltInInventory(){
        const menu = $('#built-in-inventory');
        $('#built-in-inventory').css('background', '#283654');
        menu.html('');
    }

    updateBuiltInInventory(menuData){
        const menu = $('#built-in-inventory');
        menu.html('');
        $('#built-in-inventory').css('background', '#101d42');
        for(let data of menuData){
            if(data.o_str === ''){
                data.o_str += '　';
            }
            if(!data.a_void){
                if(data.attr === 7 && !data.selector){
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
                if(data.attr === 7 && !data.selector){
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
                        "class" : "item-text item-col item-non-selectable"
                    })
                    itemText.append(this.create_text_element(`${selector} ${!data.selected ? '-' : (data.count != -1 ? '#' : '+')} ${data.o_str}`, data.color, data.text_attr, {brightBlack: '#dddddd'},'atr'));
                    // !data.ch ? item.data('selectIndex', selectorIndex) : item.data('selectIndex', null);
                    item.append(itemText);
                    menu.append(item);
                }
            }
        }

            $('#built-in-inventory').css('height', `calc(100vh - ${($('#browserhack-status').height() + 10)}px - ${($('#chat').height() + 12) + 'px'})`);
    }
    createMenu(menuData) {
        // console.log(menuData);
        this.menuMode = true;

        const menu = this.isMobile ? $('#mobile-menu') : $('#menu');
        if(this.isMobile){
            $('#mobile-button-ui').hide();
        }
        let selectorString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let selectorIndex = 0;
        for(let data of menuData){
            if(data.o_str === ''){
                data.o_str += '　';
            }
            if(!data.a_void){
                if(data.attr === 7 && !data.selector){
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
                if(data.attr === 7 && !data.selector){
                    const itemHeader = $("<div/>").attr({
                        "class" : "item-header"
                    }).text(data.o_str);
                    menu.append(itemHeader);
                }else {
                  const item = $("<div/>").attr({
                    "class" : "item noselect"
                });
                if(data.tile >= 0){
                    const itemTile = $(this.tileRenderer.getTileCanvas(data.tile)).attr({
                        "class" : "item-tile item-col"
                    });
                    item.append(itemTile);
                    const emptyDiv = $('<div class="item-text"> </div>');
                    if(this.isMobile){
                        emptyDiv.css('white-space', 'normal!important');
                    }
                    item.append(emptyDiv);
                }
                let selector = data.ch ? data.ch : selectorString.charAt(selectorIndex % 52);
                const itemText = $("<div/>").attr({
                    "class" : "item-text item-col item-selectable noselect"
                });
                    if(this.isMobile){
                        itemText.css('white-space', 'break-spaces');
                    }
                    item.data('selected', data.selected);
                    item.data('count', data.count);
                    item.data('selector', selector);
                    // !data.ch ? item.data('selectIndex', selectorIndex) : item.data('selectIndex', null);
                    item.data('selectIndex', selectorIndex);
                selectorIndex++;
                item.click(e=>{
                    e = $(e.currentTarget);
                    if(typeof e.data('selectIndex') === 'number'){
                        this.sender.selectIndex(e.data('selectIndex'));
                    }else if(e.data('selector')){
                        this.sender.key(e.data('selector').charCodeAt(0));
                    }
                });

                    itemText.append(this.create_text_element(`${selector} ${!data.selected ? '-' : (data.count != -1 ? '#' : '+')} ${data.o_str}`, data.color, data.text_attr,{brightBlack: '#dddddd', black: '#444444'}, 'atr'));
                    // !data.ch ? item.data('selectIndex', selectorIndex) : item.data('selectIndex', null);
                    item.append(itemText);
                menu.append(item);
                }
            }
        }
        if(!this.isMobile){
            $('#ui-menu').show();
        }else{
            menu.show();
            const itemHeader = $("<div/>").attr({
                "class" : "item-header"
            }).text("Menu Interaction");
            const item1 = $("<div/>").attr({
                "class" : "item noselect"
            });
            const itemText1 = $("<div/>").attr({
                "class" : "item-text item-col noselect"
            });
            itemText1.text(" - ESC");
            item1.click(_=>{
                this.sender.key(27);
            });
            item1.append(itemText1);
            const item2 = $("<div/>").attr({
                "class" : "item noselect"
            });
            const itemText2 = $("<div/>").attr({
                "class" : "item-text item-col noselect"
            });
            itemText2.text(" - Enter");
            item2.append(itemText2);
            item2.click(_=>{
                this.sender.key(13);
            });
            menu.append(itemHeader);
            menu.append(item2);
            menu.append(item1);
            menu.show();
        }
        menu.scrollTop(0);
    }

    closeMenu() {
      this.menuMode = false;

      const $menu = this.isMobile ? $('#mobile-menu') : $('#menu');
      $menu.html('');
        if(this.isMobile){
            $('#mobile-button-ui').show();
            $menu.hide();
        }
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
