$.getScriptSync = function (url){
    return new Promise((resolve, reject) => {
            $.getScript(url).done(function( script, textStatus ) {
                resolve();
            })
            .fail(function( jqxhr, settings, exception ) {
                reject(exception);
            });
    });
}
if(!self.moduleLoadComplete){
    !async function(){
        await Promise.all([
            $.getScriptSync("./js/core-utils.js"),
            $.getScriptSync("./js/tile-renderer.js"),
            $.getScriptSync("./js/site-ui-handler.js"),
            $.getScriptSync("./js/game-ui-handler.js"),
            $.getScriptSync("./js/ws-client.js"),
            $.getScriptSync("./js/ws-sender.js"),
            $.getScriptSync("./js/ws-handler.js")
        ]);
        self.moduleLoadComplete = true;
    }();
}