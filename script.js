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
    this.restartButton = this.gameContainer.querySelector('.result .restart-button');
    this.replayButton = this.gameContainer.querySelector('.result .replay-button');
    this.shareButton = this.gameContainer.querySelector('.result .share-button');

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

function History() {
    this.log = [];
}

History.encode = function (events) {
    var pad = function(str, size) {
        return new Array(size).concat([str]).join('0').slice(-size);
    };
    var rcs = [], ks = [];
    let end = 'i';
    for (var evt of events) {
        if (evt.type === 'e') {
            end = evt.value;
        } else if (evt.type === 'm') {
            rcs.push(pad(
                ((evt.r1-1) * (5*7*7) +
                (evt.r2-1) * (7*7) +
                (evt.c1-1) * 7 +
                (evt.c2-1)).toString(36), 2));
            ks.push(1 + Number(!!evt.kill));
        } else {
            return "invalid";
        }
    }
    return [rcs.join(''), parseInt(ks.join(''), 3).toString(36), end].join('-');
};

History.decode = function (str) {
    if (str == "invalid") return [{type: 'i'}];

    var [rcs, ks, end] = str.split('-');
    var karr = [...parseInt(ks, 36).toString(3)].map(i => i === '2')
    var result = rcs.match(/.{1,2}/g).map((rc, i) => {
        var v = parseInt(rc, 36);
        return {
            type: 'm',
            r1: Math.floor(1 + v / 245),
            r2: Math.floor(1 + (v % 245) / 49),
            c1: Math.floor(1 + (v % 49) / 7),
            c2: Math.floor(1 + v % 7),
            kill: karr[i],
        }
    }).concat([ { type: 'e', value: end } ]);
    return result;
};

History.prototype.clear = function () {
    while (this.log.length) {
        this.log.pop();
    }
};

History.prototype.addMove = function (pos1, pos2, isKilled) {
    this.log.push({type: 'm', r1: pos1.row, c1: pos1.col, r2: pos2.row, c2: pos2.col, kill: isKilled});
};

History.prototype.setResult = function (isWon) {
    var result = {type: 'e', value: isWon ? 'w' : 'l'};
    var log = this.log;
    if (!log) log = [result];
    else if (log[log.length - 1].type !== 'e') log.push(result);
    else log[log.length - 1] = result;
};

History.prototype.load = function (str) {
    var events = History.decode(str);
    for (var i = 0; i < events.length; ++i) {
        let evt = events[i];
        if (evt.type == 'e') {
            this.log.push({
                type: 'e',
                value: evt.result
            });
        } else if (evt.type == 'm') {
            this.log.push({
                type: 'm',
                r1: evt.r1,
                c1: evt.c1,
                r2: evt.r2,
                c2: evt.c2,
                isKilled: Number(!!evt.kill),
            });
        }
    }
};

function GameManager() {
    this.rows = 5;
    this.cols = 7;
    this.isGameover = false;

    this.actuator = new HTMLActuator;
    this.cemetery = new Cemetery;
    this.history  = new History;

    this.player = undefined;
    this.dogs = [];

    this.setup();
    this.addEventListeners();
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
};

GameManager.prototype.addEventListeners = function () {
    var self = this;

    // release guides
    this.actuator.backGrid.container.addEventListener('click', function(evt) {
        self.actuator.removeAllGuides();
    });

    // restart button
    this.actuator.restartButton.addEventListener('click', function(evt){
        self.history.clear();
        self.setup();
    });

    // replay button
    this.actuator.replayButton.addEventListener('click', function(evt){
        self.setup();
        self.replay(History.encode(self.history.log));
    });

    function copyToClipboard(val) {
        var t = document.createElement("textarea");
        document.body.appendChild(t);
        t.value = val;
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
    }

    // share replay button
    this.actuator.shareButton.addEventListener('click', function(evt){
        var url = window.location.protocol + "//" + window.location.host + window.location.pathname;
        url += '?l=' + History.encode(self.history.log);
        copyToClipboard(url);
        window.alert('Copy link to clipboard!');
    });
};

GameManager.prototype.gameover = function (isWon) {
    this.isGameover = true;
    document.body.setAttribute('class', 'gameover' + (isWon ? ' win' : ''));

    var resultContainer = document.querySelector('.game .result');
    var msg = resultContainer.querySelector('.message');
    msg.innerHTML = 'You ' + (isWon ? 'Win!' : 'Lose&mldr;');

    this.history.setResult(isWon);
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
                    let isKilled = false;
                    if (isPlayer) {
                        var tile = self.actuator.markerGrid.getTile(newPosition.row, newPosition.col);
                        if (tile) {
                            self.cemetery.addTile(tile);
                            buffaloes.splice(buffaloes.indexOf(tile), 1);
                            tile.remove();
                            isKilled = true;
                        }
                    }

                    self.actuator.markerGrid.moveTile(oldPosition, newPosition);
                    self.history.addMove(oldPosition, newPosition, isKilled);

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
                            var b2 = {row: b.row + 1, col: b.col};
                            self.actuator.markerGrid.moveTile(b, b2);
                            self.history.addMove(b, b2);
                            if (b2.row == self.rows) {
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

GameManager.prototype.replay = function (logStr) {
    var events = History.decode(logStr);
    if (!events.length) return;

    document.body.setAttribute('class', 'spectate');

    var self = this;

    function end(evt, delay) {
        setTimeout(function(){
            self.gameover(evt.result == 'w');
        }, delay);
    }

    function move(evt, delay) {
        let grid = self.actuator.markerGrid;
        let cemetery = self.cemetery;
        setTimeout(function(){
            if (evt.kill) {
                let tile = grid.getTile(evt.r2, evt.c2);
                cemetery.addTile(tile);
                tile.remove();
            }
            grid.moveTile(
                {row: evt.r1, col: evt.c1},
                {row: evt.r2, col: evt.c2}
            );
        }, delay);
    }

    events.forEach(function(evt, i) {
        if (evt.type == 'e') {
            end(evt, 1000 + (i - 1) * 1000 + 300);
        }
        else if (evt.type == 'm') {
            move(evt, 1000 + i * 1000);
        }
    });
};

window.addEventListener('load', function(){
    var gm = new GameManager;
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('l')) {
        var log = urlParams.get('l');
        gm.replay(log);
        gm.history.load(log);
    }
});
