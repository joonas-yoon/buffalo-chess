function Tile(position, value) {
    this.row = position.row;
    this.col = position.col;
    this.value = value || '';
    this.isActived = false;

    this.element = document.createElement('div');
    this.element.ref = this;

    this.applyClasses();
}

Tile.prototype.getPosition = function () {
    return {
        row: this.row,
        col: this.col
    };
}

Tile.prototype.addEvent = function (type, callback) {
    this.element.addEventListener(type, callback);
    return this.element;
};

Tile.prototype.removeEvent = function (type, callback) {
    this.element.removeEventListener(type, callback);
    return this.element;
};

Tile.prototype.movePosition = function (position) {
    this.row = position.row;
    this.col = position.col;
    this.applyClasses();
};

Tile.prototype.activate = function (boolean) {
    this.isActived = boolean;
    this.applyClasses();
}

Tile.prototype.applyClasses = function () {
    var classes = ['tile', 'row-' + this.row, 'col-' + this.col, this.value];
    if (this.isActived) classes.push('active');
    this.element.setAttribute('class', classes.join(' '));
};

function Grid(container) {
    this.rows = 7;
    this.cols = 7;
    this.tiles = {};

    this.container = container;
}

Grid.prototype.addTile = function (tile) {
    this.tiles[tile.row + '-' + tile.col] = tile;
    tile.parentGrid = this;
};

Grid.prototype.getTile = function (row, col) {
    return this.tiles[row + '-' + col];
};

Grid.prototype.moveTile = function (pos1, pos2) {
    this.tiles[pos2.row + '-' + pos2.col] = this.tiles[pos1.row + '-' + pos1.col];
    delete this.tiles[pos1.row + '-' + pos1.col];
    this.tiles[pos2.row + '-' + pos2.col].movePosition(pos2);
};

Grid.prototype.clear = function () {
    var self = this;
    Object.keys(this.tiles).forEach(function(k, i){ delete self.tiles[k]; });
    while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
    }
};

function HTMLActuator() {
    this.markerGrid = new Grid(document.querySelector('.markers'));
    this.guideGrid  = new Grid(document.querySelector('.guide'));
    this.backGrid   = new Grid(document.querySelector('.grid'));
}

HTMLActuator.prototype.addTile = function (grid, tile) {
    grid.container.appendChild(tile.element);
    grid.addTile(tile);
};

HTMLActuator.prototype.removeAllGuides = function () {
    this.guideGrid.clear();
};

HTMLActuator.prototype.addGuide = function (selection, dist) {
    dist = dist || 30;
    
    function isMovableRange(r, c) {
        return 2 <= r && r <= 6 && 1 <= c && c <= 7;
    }
    
    var dy = [-1, -1, -1, 0, 0, 1, 1, 1];
    var dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    var tiles = [];
    for (var d = 0; d < 8; ++d){
        let r = selection.row + dy[d], c = selection.col + dx[d];
        for (var t = 0; isMovableRange(r, c) && t < dist; t++){
            var marker = this.markerGrid.getTile(r, c);
            if (marker) break;

            var tile = new Tile({row: r, col: c}, selection.value);
            tile.activate(true);
            this.addTile(this.guideGrid, tile);
            tiles.push(tile);

            r += dy[d];
            c += dx[d];
        }
    }

    return tiles;
};

function GameManager() {
    this.rows = 7;
    this.cols = 7;

    this.actuator = new HTMLActuator;
    this.isGameover = false;

    this.setup();
}

GameManager.prototype.setup = function () {
    var self = this;

    for (var r = 1; r <= this.rows; ++r) {
        for (var c = 1; c <= this.cols; ++c) {
            this.actuator.addTile(this.actuator.backGrid, new Tile({ row: r, col: c }));
        }
    }

    this.addStartTiles();

    // release guides
    this.actuator.backGrid.container.addEventListener('click', function(evt) {
        self.actuator.removeAllGuides();
    });
};

GameManager.prototype.gameover = function (isWon) {
    this.isGameover = true;
    window.alert('You ' + (isWon ? 'Win!' : 'Lose!'));
};

GameManager.prototype.addStartTiles = function () {
    var self = this;

    var initPosBuffaloes = [];
    for (var i=1; i <= this.cols; ++i) initPosBuffaloes.push([1, i]);
    var middle = Math.ceil(this.rows / 2);
    var initPosDogs = [[this.rows - 1, middle - 1], [this.rows - 1, middle + 1]];
    var initPosPlayer = [[this.rows - 1, middle]];
    var buffaloes = [];

    // buffaloes
    initPosBuffaloes.forEach(function(pos, i) {
        var tile = new Tile({ row: pos[0], col: pos[1] }, 'buff');
        buffaloes.push(tile);
        self.actuator.addTile(self.actuator.markerGrid, tile);
    });

    var listener = {
        handleEvent: function (evt) {
            if (self.isGameover) return;

            self.actuator.removeAllGuides();
            var selection = evt.target.ref;
            var isPlayer = selection.value === 'player';
            var guides = self.actuator.addGuide(selection, isPlayer ? 1 : undefined);
            
            var guideListener = {
                handleEvent: function (evt) {
                    var oldPosition = selection.getPosition();
                    var newPosition = evt.target.ref.getPosition();
                    self.actuator.removeAllGuides();
                    self.actuator.markerGrid.moveTile(oldPosition, newPosition);
                    setTimeout(function(){
                        var bs = [];
                        for (var i = 0; i < buffaloes.length; ++i) {
                            if (buffaloes[i].row + 1 > 7) continue;
                            if (self.actuator.markerGrid.getTile(buffaloes[i].row + 1, buffaloes[i].col)) continue;
                            bs.push(buffaloes[i]);
                        }
                        if (bs.length) {
                            var b = bs[Math.floor(Math.random() * bs.length)].getPosition();
                            self.actuator.markerGrid.moveTile(b, {row: b.row + 1, col: b.col});
                            if (b.row + 1 == 7) {
                                self.gameover(false);
                            }
                        } else {
                            self.gameover(false);
                        }
                    }, 100);
                }
            };
            guides.forEach(function(tile){
                tile.addEvent('click', guideListener);
            });
        }
    };
    
    // dogs
    initPosDogs.forEach(function(pos, i) {
        var tile = new Tile({ row: pos[0], col: pos[1] }, 'dog');
        self.actuator.addTile(self.actuator.markerGrid, tile);
        tile.addEvent('click', listener);
    });

    // player
    initPosPlayer.forEach(function(pos, i) {
        var tile = new Tile({ row: pos[0], col: pos[1] }, 'player');
        self.actuator.addTile(self.actuator.markerGrid, tile);
        tile.addEvent('click', listener);
    });
};

window.addEventListener('load', function(){
    var gm = new GameManager;
});
