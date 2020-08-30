const express = require("express");
const http = require("http");
const process = require("process");

const DEFAULT_PORT = process.env.PORT || 80;

class WebServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = DEFAULT_PORT;
    }

    init() {
        this.app.get("/*", (req, res, next) => {
            express.static('web')(req, res, next);
        });

        this.server.listen(this.port, () => {
            console.log("Listening on port *:" + this.port);
        });
    }
}

exports = module.exports = new WebServer();
