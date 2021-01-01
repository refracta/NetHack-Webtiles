import CoreUtils from "./core-utils.js";
self.CoreUtils = CoreUtils;
import TileRenderer from "./tile-renderer.js";
self.TileRenderer = TileRenderer;

import SiteUiHandler from "./site-ui-handler.js";
self.SiteUiHandler = SiteUiHandler;
import GameUIHandler from "./game-ui-handler.js";
self.GameUIHandler = GameUIHandler;

import WSClient from "./ws-client.js";
self.WSClient = WSClient;
import WSSender from "./ws-sender.js";
self.WSSender = WSSender;
import WSHandler from "./ws-handler.js";
self.WSHandler = WSHandler;

!async function(){
    let config = await fetch('./js/config.json').then(r => r.json());

    let client = new WSClient();
    client.init();

    let sender = new WSSender(client);

    let siteUIHandler = new SiteUiHandler(sender, config);
    siteUIHandler.init();
    let gameUIHandler = new GameUIHandler(sender, config);

    let handler = new WSHandler({siteUIHandler, gameUIHandler, client, sender});
    handler.init();
}();