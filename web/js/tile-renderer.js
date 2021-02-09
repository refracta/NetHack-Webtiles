function getDefaultTileConfig(tileImage, tileData) {
    const maxWidth = 79 + 1;
    const maxHeight = 21;
    const startX = tileData.tileWidth / 2;
    const startY = tileData.tileHeight / 2;
    // const tileImage;

    return {...tileData, maxWidth, maxHeight, startX, startY, tileImage};
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
            type: this.tileConfig.extruded ? Phaser.WEBGL : Phaser.CANVAS,
            scale: {
                mode: Phaser.Scale.RESIZE,
                width: '100%',
                height: '100%',
                parent: 'tile-content',

            },
            pixelArt: this.tileConfig.extruded ? false : true,
            scene: {
                preload: function () {
                    tileThis.preload(this);
                },
                create: function () {
                    tileThis.create();
                },
                update: function () {
                    tileThis.update();
                }
            }
        };
    }

    preload(phaser) {
        this.phaser = phaser;

        /*this.phaser.load.spritesheet('tileset', this.tileConfig.tileImage, {
            frameWidth: this.tileConfig.tileWidth,
            frameHeight: this.tileConfig.tileHeight
        });*/

        this.phaser.load.image('tiles', this.tileConfig.tileImage);

        this.phaser.load.tilemapTiledJSON('map', {
            "nextobjectid": 1,
            "type": "map",
            "tilewidth": this.tileConfig.tileWidth,
            "tileheight": this.tileConfig.tileHeight,
            "orientation": "orthogonal",
            "renderorder": "right-down",
            "layers": [{
                "name": "default",
                "type": "tilelayer",
                "x": 0,
                "y": 0,
                "width": this.tileConfig.maxWidth,
                "height": this.tileConfig.maxHeight,
                "data": Array(this.tileConfig.maxWidth * this.tileConfig.maxHeight).fill(0),
                "visible": true,
                "opacity": 1,
            }],
            "tilesets": [{
                "firstgid": 1,
                "name": this.tileConfig.tileName,
                "image": this.tileConfig.tileName,
                "imagewidth": this.tileConfig.imageWidth,
                "imageheight": this.tileConfig.imageHeight,
                "tilewidth": this.tileConfig.tileWidth,
                "tileheight": this.tileConfig.tileHeight,
            }],
            "version": 1,
            "tiledversion": "1.0.3",
        });

        this.initEnd = true;
    }

    create() {
        // FOR DEBUG
        this.map = this.phaser.make.tilemap({key: 'map'});
        if(this.tileConfig.extruded){
            this.tiles = this.map.addTilesetImage(this.tileConfig.tileName, 'tiles', this.tileConfig.tileWidth, this.tileConfig.tileHeight, 1, 2);
        }else{
            this.tiles = this.map.addTilesetImage(this.tileConfig.tileName, 'tiles', this.tileConfig.tileWidth, this.tileConfig.tileHeight);
        };

        this.layer = this.map.createDynamicLayer(0, this.tiles, 0, 0);

        this.camera = this.phaser.cameras.main;

        this.marker = this.phaser.add.graphics();
        this.marker.lineStyle(1, 0x00d129, 1);
        this.marker.strokeRect(0, 0, this.tileConfig.tileWidth, this.tileConfig.tileHeight);

        this.cursorMarker = this.phaser.add.graphics();
        this.cursorMarker.lineStyle(1, 0xd10029, 1);
        this.cursorMarker.strokeRect(0, 0, this.tileConfig.tileWidth, this.tileConfig.tileHeight);
        window.R = this;
    }

    update() {
        this.camera.centerOn(this.tileConfig.tileWidth * this.cursorX + this.tileConfig.tileWidth / 2,
            this.tileConfig.tileHeight * this.cursorY + this.tileConfig.tileHeight / 2);
        this.marker.x = this.map.tileToWorldX(this.cursorX);
        this.marker.y = this.map.tileToWorldY(this.cursorY);


        let worldPoint = this.phaser.input.activePointer.positionToCamera(this.camera);

        let pointerTileX = this.map.worldToTileX(worldPoint.x);
        let pointerTileY = this.map.worldToTileY(worldPoint.y);

        this.cursorMarker.x = this.map.tileToWorldX(pointerTileX);
        this.cursorMarker.y = this.map.tileToWorldY(pointerTileY);
    }

    drawTile(x, y, tile) {
        this.map.putTileAt(tile + 1, x, y);
    }

    drawTileByData(data) {
        this.drawTile(...to2DXY(data.i), data.t);
    }

    setZoom(scale){
        this.camera.setZoom(scale);
    }
    getZoom(){
        return this.camera.zoom;
    }

    clearTile() {
        this.camera.fadeIn(500);
        for (let x = 0; x < this.tileConfig.maxWidth; x++) {
            for (let y = 0; y < this.tileConfig.maxHeight; y++) {
                this.map.putTileAt(0, x, y);
            }
        }
    }

    init() {
        this.game = new Phaser.Game(this.getPhaserConfig());
    }


    setCursor(i) {
        let [x, y] = to2DXY(i);
        this.cursorX = x;
        this.cursorY = y;
    }
}

export default TileRenderer;