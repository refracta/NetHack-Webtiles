var socket = io();

$(document).ready(() => {
    $('body').keypress(e => {
        var code = e.charCode || e.keyCode;
        // S-space: toggle zoom
        if ((code == 32) && (e.shiftKey) && !(e.ctrlKey || e.altKey || e.metaKey)) {
            //nethack.btn_toggle_zoom.click();
        } else {
            if (e.ctrlKey)
                return; // should have been processed in keydown
            socket.emit('connection', {
                msg: 'key',
                keyCode: code
            });
        }
    });
    $('body').keydown(e => {
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
        socket.emit('connection', {
            msg: 'key',
            keyCode: code
        });
    });
});

socket.on('connection', function (data) {
    console.log(data);
});