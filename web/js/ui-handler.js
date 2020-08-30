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
        $('#main-content').clear();
    }

    setAccountInfo(text) {
        $('#account-info').text(text);
    }

    setLoginUI() {
        $('#login-form').hide();
        $('#register-btn').hide();
        $('#logout-btn').show();
    }

    init(wsClient) {

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
        let loginInfo;
        let status;
        wsClient.handler = (data, socket) => {
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
                    this.setAccountInfo(`Welcome to Hacktiles ${loginInfo.username}! XD`);
                    loginInfo.games.forEach((g, i, a) => {
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
                    loginInfo.games.forEach((g, i, a) => {
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
                case 'status':
                    this.clearMainContent();
                    if (data.status == 'play') {

                    } else if (data.status == 'watch') {

                    } else if (data.status == 'lobby') {

                    }
                    break;
            }

        }
    }
}

export default new UIHandler();