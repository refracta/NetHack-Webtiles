import wsClient from "./ws-client.js";
wsClient.init();

import uiHandler from "./ui-handler.js";
self.uiHandler = uiHandler;
uiHandler.init(wsClient);




/*
$(document).ready(() => {
    $('body').keypress(e => {
        var code = e.charCode || e.keyCode;
        // S-space: toggle zoom
        if ((code == 32) && (e.shiftKey) && !(e.ctrlKey || e.altKey || e.metaKey)) {
            //nethack.btn_toggle_zoom.click();
        } else {
            if (e.ctrlKey)
                return; // should have been processed in keydown
			$('#key-ui').text(`keyCode: ${code}`);
            socket.emit({
                msg: 'key',
                keyCode: code
            });
        }
    });
    $('body').keydown(e => {
        if (e.keyCode == 27) {
			$('#key-ui').text(`keyCode: ${e.keyCode}`);
            socket.emit({
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
		$('#key-ui').text(`keyCode: ${code}`);
        socket.emit( {
            msg: 'key',
            keyCode: code
        });
    });

    // tileInit();
});

const TILE_SIZE = 32;
const MAX_X = 79 + 1;
const MAX_Y = 21;
const START_X = TILE_SIZE / 2;
const START_Y = TILE_SIZE / 2;
const MAX_LINE = 12;

// 서버로 부터 메시지를 수신한다
socket.onmessage = function(event) {
    var data = JSON.parse(event.data);
    if (data.msg == 'putstr') {
        if ($('#msg-ui p').length > MAX_LINE) {
            $($('#msg-ui p')[0]).remove();
        }
        var pText = $('<p style="margin: 0px"></p>');
        pText.text(data.str);
        if(data.str.includes('You descend the stairs.') || data.str.includes('You climb up the stairs.')){
            tile.add.rectangle(0, 0, MAX_X*64, MAX_Y*64, 0x000000);
        }
        $('#msg-ui').append(pText);
    } else if (data.msg == 'update_tile') {
        tile.add.image(START_X + data.x * TILE_SIZE, START_Y + data.y * TILE_SIZE, 'tile', data.tile);
    }else if (data.msg == 'status_update') {
        if(data.fldidx == 20){
            $('#dungeon-level').text("던전 레벨: "+data.text);
            return;
        }else if(data.fldidx == 17){
            $('#hungry-level').text("배고픔: "+data.text);
            return;
        }else if(data.fldidx == 18){
            $('#hp-level').text("체력: "+data.text);
            return;
        } // 0 로어
        if ($('#status-ui p').length > 3) {
            $($('#status-ui p')[0]).remove();
        }
        var pText = $('<p style="margin: 0px"></p>');
        pText.text(`${data.fldidx}: ${data.text}`);
        $('#status-ui').append(pText);
    }

}


function tileInit() {
    var config = {
        type: Phaser.WEBGL,
        parent: 'tile-ui',
        width: MAX_X * TILE_SIZE,
        height: MAX_Y * TILE_SIZE,
        scene: {
            preload: preload,
            create: create
        }
    };

    self.game = new Phaser.Game(config);

    function preload() {
        this.load.spritesheet('tile', 'Nevanda-32x32.png', {
            frameWidth: TILE_SIZE,
            frameHeight: TILE_SIZE
        });
    }

    function create() {
        self.tile = this;
    }
}

$(document).ready(e=>{
    $('#register').click(e=>{
        $('#modalRegisterForm').modal('show');
    });
});
*/