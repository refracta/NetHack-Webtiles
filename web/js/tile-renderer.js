function getDefaultTileConfig(tileImage, tileData) {
    const maxX = 79 + 1;
    const maxY = 21;
    const startX = tileData.tileWidth / 2;
    const startY = tileData.tileHeight / 2;
    // const tileImage;

    return {...tileData, maxX, maxY, startX, startY, tileImage};
}

const MATRIX_COL = 256;

function to2DIndex(x, y) {
    return y * MATRIX_COL + x;
}

function to2DY(index) {
    return Math.floor(index / MATRIX_COL);
}

function to2DX(index) {
    return index - to2DY(MATRIX_COL, index) * MATRIX_COL;
}

function to2DXY(index) {
    let y = Math.floor(index / MATRIX_COL);
    let x = index - y * MATRIX_COL;
    return [x, y];
}


class TileRenderer {
    constructor(tileImage, tileData) {
        this.tileConfig = getDefaultTileConfig(tileImage, tileData);
        this.imageArray = Array.from(Array(this.tileConfig.maxX), () => new Array(this.tileConfig.maxY));


    }

    getPhaserConfig() {
        let tileThis = this;
        return {
            // 자원 회수를 안해서 WEBGL이 느렸던 것으로 추정, 재사용 검토
            type: Phaser.CANVAS,
            parent: 'tile-content',
            width: this.tileConfig.maxX * this.tileConfig.tileWidth,
            height: this.tileConfig.maxY * this.tileConfig.tileHeight,
            scene: {
                preload: function () {
                    tileThis._preload.call(this, tileThis);
                },
                create: function () {
                    tileThis._create.call(this, tileThis);
                }
            }
        };
    }

    _preload(tileThis) {
        tileThis.renderer = this;
        $(this.game.canvas).css('width', '100%');
        this.load.spritesheet('tileset', tileThis.tileConfig.tileImage, {
            frameWidth: tileThis.tileConfig.tileWidth,
            frameHeight: tileThis.tileConfig.tileHeight
        });
        tileThis.clearTile();
        if (tileThis.preload) {
            tileThis.preload.call(this);
        }
        tileThis.initEnd = true;
    }

    _create(tileThis) {
        if (tileThis.create) {
            tileThis.create.call(this);
        }
    }

    drawTile(x, y, tile) {
        this.imageArray[x][y] ? this.imageArray[x][y].destroy() : void 0;
        this.imageArray[x][y] = this.renderer.add.image(this.tileConfig.startX + x * this.tileConfig.tileWidth, this.tileConfig.startY + y * this.tileConfig.tileHeight, 'tileset', tile);
    }

    drawTileByData(data) {
        this.drawTile(...to2DXY(data.i), data.t);
    }

    clearTile() {
        this.imageArray.flat().filter(i=>i).forEach(i=>i.destroy());
    }

    init() {
        this.game = new Phaser.Game(this.getPhaserConfig());
    }
}

export default TileRenderer;