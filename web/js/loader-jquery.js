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
        await $.getScriptSync("./js/core-utils.js");
        await $.getScriptSync("./js/tile-renderer.js");
        await $.getScriptSync("./js/site-ui-handler.js");
        await $.getScriptSync("./js/game-ui-handler.js");
        await $.getScriptSync("./js/ws-client.js");
        await $.getScriptSync("./js/ws-sender.js");
        await $.getScriptSync("./js/ws-handler.js");
        self.moduleLoadComplete = true;
    }();
}