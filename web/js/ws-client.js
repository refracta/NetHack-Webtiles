const DEFAULT_ENDPOINT = "/";

class WSClient {
    constructor() {
        this.endpoint = DEFAULT_ENDPOINT;
    }

    getWebSocketPath() {
        return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${this.endpoint}`;
    }

    init() {
        this.socket = new WebSocket(this.getWebSocketPath());
    }

    send(data) {
        this.socket.send(JSON.stringify(data));
    }
}

// export default WSClient;
