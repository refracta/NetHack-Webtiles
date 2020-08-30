function getTileConfig(){
    const tileSize = 32;
    const maxX = 79 + 1;
    const maxY = 21;
    const startX = tileSize / 2;
    const startY = tileSize / 2;

    return {tileSize, maxX, maxY, startX, startY};
}


class TileRenderer {
    constructor() {
        this.tileConfig = getTileConfig();
    }
    init() {

    }
}

export default new TileRenderer();