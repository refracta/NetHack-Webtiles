class UDSSender {
    constructor(server) {
        this.server = server;
    }

    close(udsInfoList) {
        this.server.sendToList({msg: 'close'}, udsInfoList);
    }
    data(data, udsInfoList = Object.values(this.server.connectionInfoMap)) {
        this.server.sendToList(data, udsInfoList);
    }
}

exports = module.exports = UDSSender;
