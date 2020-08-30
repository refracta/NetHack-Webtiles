const DEFAULT_ENDPOINT = "/";

class WSClient {
    constructor() {
        this.endpoint = DEFAULT_ENDPOINT;
    }

    getWebSocketPath() {
        return `${location.protocol === 'https:' ? 'wss:' : 'ws'}://${location.host}${this.endpoint}`;
    }

    init() {
        this.socket = new WebSocket(this.getWebSocketPath());
        this.socket.onopen = (event) => {
            if (localStorage.sessionKey) {
                this.send({msg: 'login', sessionKey: localStorage.sessionKey});
            }
            let play = location.hash.match(/^#play-(.+)/i);
            let watch = location.hash.match(/^#watch-(.+)/i);
            if (play) {
                this.send({msg: 'status_change', status: 'play', id: play[1]});
            } else if (watch) {
                this.send({msg: 'status_change', status: 'watch', username: watch[1]});
            } else {
                this.send({msg: 'status_change', status: 'lobby'});
            }
        }
        this.socket.onerror = (event) => {
            alert("Connection Error!");
            //console.log("Server error message: ", event.data);
        }
        this.socket.onclose = (event) => {
            alert("Connection Close!");
            //console.log("Server error message: ", event.data);
        }
        this.socket.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                console.error('Error JSON Parsing:', message);
            }

            if (this.handler) {
                this.handler(data, this.socket);
            }
        }
    }

    send(data) {
        this.socket.send(JSON.stringify(data));
    }
}

export default new WSClient();