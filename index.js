const fs = require('fs');

const Utils = require('./utils.js');
const games = JSON.parse(fs.readFileSync('./games.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const db = require('./local-db.js');
const web = require('./web-server.js');
const uds = require('./uds-server.js');
const ws = require('./ws-server.js');

const UDSHandler = require('./uds-handler.js');
const UDSSender = require('./uds-sender.js');
const WSHandler = require('./ws-handler.js');
const WSSender = require('./ws-sender.js');

const udsSender = new UDSSender(uds);
const wsSender = new WSSender(ws);
const udsHandler = new UDSHandler(uds);
const wsHandler = new WSHandler(ws);
udsHandler.init({wsSender, wsHandler});
wsHandler.init({sender: wsSender, udsSender, udsHandler, games, config, db});



Object.values(games).forEach(g => {
    !fs.existsSync(g.rcPath) ? Utils.mkDirByPathSync(g.rcPath) : void 0;
    !fs.existsSync(g.ttyrecPath) ? Utils.mkDirByPathSync(g.ttyrecPath) : void 0;
});




db.init();
web.init();
uds.init();
ws.init({
    server: web.server, path: "/",
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed.
    }
});

