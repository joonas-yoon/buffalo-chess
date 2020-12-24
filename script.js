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

Tile.prototype.remove = function () {
    if (this.element) {
        this.element.parentNode.removeChild(this.element);
    }
}

function Grid(container) {
    this.rows = 1;
    this.cols = 1;
    this.tiles = {};

    this.container = container;
}

Grid.prototype.setSize = function (rows, cols) {
    if (rows !== undefined) this.rows = rows;
    if (cols !== undefined) this.cols = cols;
};

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

Grid.prototype.isInRange = function (row, col) {
    return 1 <= row && row <= this.rows && 1 <= col && col <= this.cols;
};

Grid.prototype.isInRangeMovable = function (row, col) {
    return 2 <= row && row <= (this.rows - 1) && 1 <= col && col <= this.cols;
};

function HTMLActuator() {
    this.gameContainer = document.querySelector('.game');
    this.restartButton = this.gameContainer.querySelector('.result .button');

    this.markerGrid = new Grid(this.gameContainer.querySelector('.markers'));
    this.guideGrid  = new Grid(this.gameContainer.querySelector('.guide'));
    this.backGrid   = new Grid(this.gameContainer.querySelector('.grid'));
}

HTMLActuator.prototype.setup = function (rows, cols) {
    this.markerGrid.setSize(rows, cols);
    this.guideGrid.setSize(rows, cols);
    this.backGrid.setSize(rows, cols);
};

HTMLActuator.prototype.clear = function () {
    this.markerGrid.clear();
    this.guideGrid.clear();
    this.backGrid.clear();
};

HTMLActuator.prototype.addTile = function (grid, tile) {
    grid.container.appendChild(tile.element);
    grid.addTile(tile);
};

HTMLActuator.prototype.removeAllGuides = function () {
    this.guideGrid.clear();
};

HTMLActuator.prototype.addGuide = function (selection, dist) {
    dist = dist || 30;
    
    var dy = [-1, -1, -1, 0, 0, 1, 1, 1];
    var dx = [-1, 0, 1, -1, 1, -1, 0, 1];
    var tiles = [];
    var isPlayer = selection.value == 'player';
    for (var d = 0; d < 8; ++d){
        let r = selection.row + dy[d], c = selection.col + dx[d];
        for (let t = 0; this.backGrid.isInRangeMovable(r, c) && t < dist; t++){
            var marker = this.markerGrid.getTile(r, c);
            
            if (marker) {
                if (!isPlayer) break;
                if (isPlayer && marker.value != 'buff') break;
            }

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

function Cemetery() {
    this.tiles = [];

    this.container = document.querySelector('.cemetery');
}

Cemetery.prototype.addTile = function (tile) {
    this.tiles.push(tile);
    this.container.appendChild(tile.element.cloneNode(true));
};

Cemetery.prototype.clear = function () {
    this.tiles = [];
    while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
    }
};

function GameManager() {
    this.rows = 5;
    this.cols = 7;
    this.isGameover = false;

    this.actuator = new HTMLActuator;
    this.cemetery = new Cemetery;

    this.player = undefined;
    this.dogs = [];

    this.setup();
}

GameManager.prototype.init = function () {
    this.isGameover = false;
    document.body.removeAttribute('class');

    this.player = new Tile({ row: this.rows - 1, col: Math.ceil(this.cols / 2) }, 'player');

    while (this.dogs.length) {
        this.dogs[this.dogs.length - 1].remove();
        this.dogs.pop();
    }
    this.dogs = [];
    
    this.cemetery.clear();

    this.actuator.clear();
};

GameManager.prototype.setup = function () {
    this.init();

    this.actuator.setup(this.rows, this.cols);

    for (var r = 1; r <= this.rows; ++r) {
        for (var c = 1; c <= this.cols; ++c) {
            this.actuator.addTile(this.actuator.backGrid, new Tile({ row: r, col: c }));
        }
    }

    this.addStartTiles();
    
    // release guides
    var self = this;
    this.actuator.backGrid.container.addEventListener('click', function(evt) {
        self.actuator.removeAllGuides();
    });

    this.actuator.restartButton.addEventListener('click', function(evt){
        self.init();
        self.setup();
    });
};

GameManager.prototype.gameover = function (isWon) {
    this.isGameover = true;
    document.body.setAttribute('class', 'gameover' + (isWon ? ' win' : ''));

    var resultContainer = document.querySelector('.game .result');
    var msg = resultContainer.querySelector('.message');
    msg.innerHTML = 'You ' + (isWon ? 'Win!' : 'Lose&mldr;');
};

GameManager.prototype.selectNextBuffalo = function (buffaloes) {
    // Sometimes, it selects a random buffalo (probability: 1%)
    if (Math.random() < 0.01) {
        return buffaloes[Math.floor(Math.random() * buffaloes.length)];
    }

    var self = this;

    function blockedByDog(pos) {
        for (var i = 0; i < self.dogs.length; ++i) {
            if (pos.col == self.dogs[i].col) return 1;
        }
        return 0;
    }
    
    // Or with my heuristic function
    function calcWeight(p, b) {
        // it can go in
        if (b.row + 1 == self.rows){
            return 999;
        }
        // it will be dead in next turn
        var returnWeight = true;
        if (Math.abs(p.row - b.row) <= 1 && Math.abs(p.col - b.col) <= 1) {
            // but, he has will (10%)
            if (Math.random() >= 0.1) returnWeight = false;
        }
        // returns calculated weight
        if (returnWeight) {
            return 5 * (b.row - blockedByDog(b)) + Math.abs(p.col - b.col) + Math.random();
        } else {
            // never selected
            return -999;
        }
    };

    var result = buffaloes[0];
    for (var i = 1; i < buffaloes.length; ++i) {
        if (calcWeight(this.player, result) < calcWeight(this.player, buffaloes[i])) {
            result = buffaloes[i];
        }
    }
    return result;
};

GameManager.prototype.addStartTiles = function () {
    var self = this;

    var initPosBuffaloes = [];
    for (var i = 1; i <= this.cols; ++i) initPosBuffaloes.push([1, i]);
    var middle = Math.ceil(this.cols / 2);
    var initPosDogs = [[this.rows - 1, middle - 1], [this.rows - 1, middle + 1]];
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
                    // selection moves
                    var oldPosition = selection.getPosition();
                    var newPosition = evt.target.ref.getPosition();

                    self.actuator.removeAllGuides();

                    // if player, buffalo can be killed
                    if (isPlayer) {
                        var tile = self.actuator.markerGrid.getTile(newPosition.row, newPosition.col);
                        if (tile) {
                            self.cemetery.addTile(tile);
                            buffaloes.splice(buffaloes.indexOf(tile), 1);
                            tile.remove();
                        }
                    }

                    self.actuator.markerGrid.moveTile(oldPosition, newPosition);

                    // buffalo moves
                    setTimeout(function(){
                        var bs = [];
                        for (var i = 0; i < buffaloes.length; ++i) {
                            if (buffaloes[i].row + 1 > self.rows) continue;
                            if (self.actuator.markerGrid.getTile(buffaloes[i].row + 1, buffaloes[i].col)) continue;
                            bs.push(buffaloes[i]);
                        }
                        if (bs.length) {
                            var b = self.selectNextBuffalo(bs).getPosition();
                            self.actuator.markerGrid.moveTile(b, {row: b.row + 1, col: b.col});
                            if (b.row + 1 == self.rows) {
                                self.gameover(false);
                            }
                        } else {
                            self.gameover(true);
                        }
                    }, 200);
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
        self.dogs.push(tile);
        tile.addEvent('click', listener);
    });

    // player
    this.actuator.addTile(this.actuator.markerGrid, this.player);
    this.player.addEvent('click', listener);
};

window.addEventListener('load', function(){
    var gm = new GameManager;
});
