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
            let watch = location.hash.match(/^#watch-(.+)/i);
           if (watch) {
                this.send({msg: 'watch', username: watch[1]});
            } else {
                this.send({msg: 'lobby'});
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
        this.socket.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                console.error('Error JSON Parsing:', message);
            }
            console.log('RAW DATA:' ,data);
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