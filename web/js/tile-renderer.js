function getDefaultTileConfig(tileImage, tileData) {
    const maxWidth = 80;
    const maxHeight = 21;
    const tileRows = Math.ceil(tileData.imageWidth / (tileData.tileWidth + (tileData.extruded ? 2 : 0)));
    const tileColumns = Math.ceil(tileData.imageHeight / (tileData.tileHeight + (tileData.extruded ? 2 : 0)));
    const maxTile = tileRows * tileColumns;
    return {...tileData, maxWidth, maxHeight, tileImage, tileRows, tileColumns, maxTile};
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
    constructor(tileImage, tileData, eventHandlerMap, isMobile) {
        this.isMobile = isMobile;
        this.eventHandlerMap = eventHandlerMap;
        this.tileConfig = getDefaultTileConfig(tileImage, tileData);
        this.imageArray = Array.from(Array(this.tileConfig.maxX), () => new Array(this.tileConfig.maxY));
    }

    getPhaserConfig() {
        let tileThis = this;
        return {
            type: (this.tileConfig.extruded || this.tileConfig.forceWebGL) ? Phaser.WEBGL : Phaser.CANVAS,
            scale: {
                mode: Phaser.Scale.RESIZE,
                width: '100%',
                height: '100%',
                parent: 'tile-content',
            },
            render:{
                pixelArt: (this.tileConfig.extruded || this.tileConfig.forceWebGL) ? false : true,
                antialias: false
            },
            scene: {
                preload: function () {
                    tileThis.preload(this);
                },
                create: function () {
                    tileThis.create(this);
                },
                update: function () {
                    tileThis.update(this);
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
        this.phaser.load.image('hilite_pet' ,'/assets/hilite/pet.png');

        this.phaser.load.image('hilite_pile', '/assets/hilite/pile.png');
        this.hiliteMap = {};
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
        this.phaser.load.plugin('rexpinchplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexpinchplugin.min.js', true);
    }

    create(phaser) {
        var dragScale = this.phaser.plugins.get('rexpinchplugin').add(this.phaser);
        var camera = this.phaser.cameras.main;
        camera.zoom = window.devicePixelRatio;
        camera.roundPixels = true;
        dragScale
            .on('drag1', function (dragScale) {
                var drag1Vector = dragScale.drag1Vector;
                camera.scrollX -= drag1Vector.x / camera.zoom;
                camera.scrollY -= drag1Vector.y / camera.zoom;
                this.dragCount++;
                this.nDragCount++;
            }, this)
            .on('pinch', function (dragScale) {
                var scaleFactor = dragScale.scaleFactor;
                camera.zoom *= scaleFactor;
                this.dragCount++;
                this.nDragCount++;
            }, this)

        // FOR DEBUG
        this.hilite = {};


        this.map = this.phaser.make.tilemap({key: 'map'});
        if(this.tileConfig.extruded){
            this.tiles = this.map.addTilesetImage(this.tileConfig.tileName, 'tiles', this.tileConfig.tileWidth, this.tileConfig.tileHeight, 1, 2);
        }else{
            this.tiles = this.map.addTilesetImage(this.tileConfig.tileName, 'tiles', this.tileConfig.tileWidth, this.tileConfig.tileHeight);
        };

        this.layer = this.map.createDynamicLayer(0, this.tiles, 0, 0);

        this.camera = this.phaser.cameras.main;

        this.mapOutline = this.phaser.add.graphics();
        this.mapOutline.lineStyle(1, 0x505050, 1);
        this.mapOutline.strokeRect(this.tileConfig.tileWidth, 0, this.tileConfig.tileWidth * this.tileConfig.maxWidth, this.tileConfig.tileHeight * this.tileConfig.maxHeight);

        this.marker = this.phaser.add.graphics();

        this.cursorMarker = this.phaser.add.graphics();
        this.cursorMarker.lineStyle(1, 0xffff00, 1);
        this.cursorMarker.strokeRect(0, 0, this.tileConfig.tileWidth, this.tileConfig.tileHeight);
        //this.mapOutline.x = this.map.tileToWorldX(this.cursorX);
        //this.mapOutline.y = this.map.tileToWorldY(this.cursorY);

        this.tileSourceImage = this.phaser.textures.get('tiles').getSourceImage();

        this.phaser.input.on('pointerdown', function (pointer) {
            if(pointer.leftButtonDown()){
                this.click = 1;
            }else if(pointer.rightButtonDown()){
                this.click = 2;
            }else if(pointer.middleButtonDown()){
                this.click = 3;
            }
            this.dragCount = 0;
            this.nDragCount = 0;
        }, this);

        this.phaser.input.on('pointerup', function (pointer) {
            this.nDragCount = 0;
            if(this.dragCount > 5){
                return;
            }

            if(this.eventHandlerMap.travelClick){
                if(!this.click){
                    return;
                }

                let worldPoint = this.phaser.input.activePointer.positionToCamera(this.camera);

                let pointerTileX = this.map.worldToTileX(worldPoint.x);
                let pointerTileY = this.map.worldToTileY(worldPoint.y);
                //console.log('CLICKED', pointerTileX, pointerTileY, to2DIndex(pointerTileX, pointerTileY));
                this.eventHandlerMap.travelClick(to2DIndex(pointerTileX, pointerTileY), this.click);
                this.click = void 0;
            }
        }, this);
        this.setMarkerColor(1);
        this.initEnd = true;

        window.R = this;
    }

    setMarkerColor(hpRatio){
        let green = Math.floor(255 * hpRatio);
        let red = 255 - green;
        this.markerColor = (red << 16) + (green << 8);
    }

    addTileDebugMarker() {
        for (let x = 0; x < this.tileConfig.maxWidth; x++) {
            for (let y = 0; y < this.tileConfig.maxHeight; y++) {
                let i = to2DIndex(x, y);
                let text = this.phaser.add.text(0, 0, `X:${x}\nY:${y}\nI:${i}`);
                text.setOrigin(0,0);
                text.setFontSize(8);
                text.x = this.tileConfig.tileWidth * (x);
                text.y = this.tileConfig.tileHeight * (y);
            }
        }
    }

    getTileCanvas(tile) {
        let canvas = document.createElement('canvas');
        canvas.width = this.tileConfig.tileWidth;
        canvas.height = this.tileConfig.tileHeight;
        const ctx = canvas.getContext('2d');

        let y = Math.floor(tile / this.tileConfig.tileRows);
        let x = tile % this.tileConfig.tileRows;

        ctx.drawImage(this.tileSourceImage,
            x * this.tileConfig.tileWidth + (this.tileConfig.extruded ? x * 2 + 1 : 0), y * this.tileConfig.tileHeight + (this.tileConfig.extruded ? y * 2 + 1 : 0),
            this.tileConfig.tileWidth, this.tileConfig.tileHeight,
            0, 0,
            this.tileConfig.tileWidth, this.tileConfig.tileHeight);

        return canvas;
    }

    update(phaser) {
/*        this.camera.centerOn(this.tileConfig.tileWidth * this.cursorX + this.tileConfig.tileWidth / 2,
        this.tileConfig.tileHeight * this.cursorY + this.tileConfig.tileHeight / 2);*/

        this.marker.clear();
        this.marker.lineStyle(1, this.markerColor, 1);
        this.marker.strokeRect(0, 0, this.tileConfig.tileWidth, this.tileConfig.tileHeight);
        this.marker.x = this.map.tileToWorldX(this.cursorX);
        this.marker.y = this.map.tileToWorldY(this.cursorY);

        let worldPoint = this.phaser.input.activePointer.positionToCamera(this.camera);

        let pointerTileX = this.map.worldToTileX(worldPoint.x);
        let pointerTileY = this.map.worldToTileY(worldPoint.y);

        this.cursorMarker.x = this.map.tileToWorldX(pointerTileX);
        this.cursorMarker.y = this.map.tileToWorldY(pointerTileY);
    }

    drawTileByData(data) {
        let [x, y] = to2DXY(data.i);
        this.map.putTileAt(data.t + 1, x, y);
        let hiliteInfo = this.hiliteMap[data.i];
        if(!hiliteInfo){
            hiliteInfo = {};
            this.hiliteMap[data.i] = hiliteInfo;
        }
        if(!data.f){
            if(hiliteInfo.image){
                hiliteInfo.image.destroy();
                this.hiliteMap[data.i] = {};
            }
        }else if(data.f && hiliteInfo.f != data.f){
            if(hiliteInfo.image){
               hiliteInfo.image.destroy();
            }
            hiliteInfo.image = this.phaser.add.image(0, 0, data.f);

            hiliteInfo.image.scaleX = (this.tileConfig.tileWidth / 32) * 2;
            //console.log(hiliteInfo.image.scaleX);
            hiliteInfo.image.scaleY = (this.tileConfig.tileHeight / 32) * 2;
            hiliteInfo.smoothed = false;
            hiliteInfo.image.setOrigin(0,0);

            hiliteInfo.image.x = this.tileConfig.tileWidth * (x + 0.6);
            hiliteInfo.image.y = this.tileConfig.tileHeight * (y + 0.1);
            hiliteInfo.f = data.f;
            // this.H = hiliteInfo;
        }
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
                let i = to2DIndex(x, y);
                let hiliteInfo = this.hiliteMap[i];
                if(hiliteInfo && hiliteInfo.image){
                    hiliteInfo.image.destroy();
                    this.hiliteMap[i] = {};
                }
            }
        }
        this.hiliteMap = {};
    }

    init() {
        this.game = new Phaser.Game(this.getPhaserConfig());
    }


    setCursor(i) {
        let [x, y] = to2DXY(i);
        this.cursorX = x;
        this.cursorY = y;
        if(!(this.nDragCount && this.nDragCount > 0)){
            this.camera.centerOn(this.tileConfig.tileWidth * this.cursorX + this.tileConfig.tileWidth / 2,
                this.tileConfig.tileHeight * this.cursorY + this.tileConfig.tileHeight / 2);
        }
    }
}

// export default TileRenderer;
