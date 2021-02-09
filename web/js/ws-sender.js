class WSSender {
    constructor(client) {
        this.client = client;
    }

    play(id) {
        this.client.send({msg: 'play', id});
    }

    saveRC(id, rcText) {
        this.client.send({msg: 'save_rc', id, rcText});
    }

    getRC(id) {
        this.client.send({msg: 'get_rc', id});
    }

    key(keyCode) {
        this.client.send({msg: 'key', keyCode});
    }

    loginBySessionKey(sessionKey) {
        this.client.send({msg: 'login', sessionKey: localStorage.sessionKey});
    }

    login(username, password) {
        this.client.send({msg: 'login', username, password});
    }

    register(username, password, email) {
        this.client.send({msg: 'register', username, password, email});
    }

    watch(username) {
        this.client.send({msg: 'watch', username});
    }

    lobby() {
        this.client.send({msg: 'lobby'});
    }
    chatMsg(text, isPublic) {
        this.client.send({msg: 'chat_msg', text, isPublic});
    }
}

export default WSSender;