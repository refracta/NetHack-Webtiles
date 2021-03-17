!async function () {
    await waitFor(_ => self.moduleLoadComplete);
    let config = await fetch('./js/config.json').then(r => r.json());

    let client = new WSClient();
    client.init();

    let sender = new WSSender(client);

    let siteUIHandler = new SiteUIHandler(sender, config);
    siteUIHandler.init();
    let gameUIHandler = new GameUIHandler(sender, config);

    let handler = new WSHandler({siteUIHandler, gameUIHandler, client, sender});
    handler.init();
}();

