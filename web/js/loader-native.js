import CoreUtils from "./core-utils.js";
self.CoreUtils = CoreUtils;
import TileRenderer from "./tile-renderer.js";
self.TileRenderer = TileRenderer;

import SiteUIHandler from "./site-ui-handler.js";
self.SiteUIHandler = SiteUIHandler;
import GameUIHandler from "./game-ui-handler.js";
self.GameUIHandler = GameUIHandler;

import WSClient from "./ws-client.js";
self.WSClient = WSClient;
import WSSender from "./ws-sender.js";
self.WSSender = WSSender;
import WSHandler from "./ws-handler.js";
self.WSHandler = WSHandler;

self.moduleLoadComplete = true;