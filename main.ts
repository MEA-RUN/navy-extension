namespace navy {
    // ===== ÉTAT INTERNE =====

    let _hits: number[] = []
    let _gameOver = false
    let _isMyTurn = false
    let _waiting = false
    let _cursorCol = 0
    let _cursorRow = 0
    let _step = 0

    let _setupCb: () => void = function () { }
    let _shotCb: (index: number) => void = function (index: number) { }
    let _drawCb: () => void = function () { }

    // ===== COORDONNÉES =====

    export function toX(index: number): number { return index % 5 }
    export function toY(index: number): number { return Math.floor(index / 5) }
    export function toIndex(x: number, y: number): number { return y * 5 + x }

    // ===== AFFICHAGE =====

    export function plotCell(index: number, brightness: number): void {
        led.plotBrightness(toX(index), toY(index), brightness)
    }

    export function plotCells(cells: number[], brightness: number): void {
        for (let cell of cells) {
            plotCell(cell, brightness)
        }
    }

    function plotColumn(col: number): void {
        for (let y = 0; y <= 4; y++) led.plot(col, y)
    }

    function plotRow(row: number): void {
        for (let x = 0; x <= 4; x++) led.plot(x, row)
    }

    export function plotHits(): void {
        plotCells(_hits, 255)
    }

    export function plotCursor(): void {
        if (!_isMyTurn) return
        if (control.millis() % 600 < 300) {
            if (_step == 0) plotColumn(_cursorCol)
            else plotRow(_cursorRow)
        }
        if (_step == 1) plotColumn(_cursorCol)
    }

    // ===== UTILITAIRES =====

    export function contains(arr: number[], val: number): boolean {
        for (let item of arr) {
            if (item == val) return true
        }
        return false
    }

    export function placeBoats(boats: number[], count: number): void {
        while (boats.length < count) {
            let index = randint(0, 24)
            if (!contains(boats, index)) boats.push(index)
        }
    }

    // ===== RADIO =====

    export function sendHit(): void { radio.sendString("R,HIT") }
    export function sendMiss(): void { radio.sendString("R,MISS") }
    export function sendWin(): void { radio.sendString("R,WIN") }

    export function lose(): void {
        sendWin()
        _gameOver = true
        basic.showIcon(IconNames.Sad)
        basic.pause(500)
        basic.clearScreen()
        basic.showString("LOSE")
    }

    // ===== ENREGISTREMENT DES CALLBACKS =====

    export function onSetup(handler: () => void): void {
        _setupCb = handler
    }

    export function onEnemyShot(handler: (index: number) => void): void {
        _shotCb = handler
    }

    export function onDraw(handler: () => void): void {
        _drawCb = handler
    }

    // ===== DÉMARRAGE =====

    function reset(): void {
        _hits = []
        _gameOver = false
        _isMyTurn = false
        _waiting = false
        _cursorCol = 0
        _cursorRow = 0
        _step = 0
    }

    export function start(group: number): void {
        radio.setGroup(group)
        reset()
        _setupCb()

        input.onButtonPressed(Button.A, function () {
            if (_isMyTurn && !_waiting && !_gameOver) {
                if (_step == 0) _cursorCol = (_cursorCol + 1) % 5
                else _cursorRow = (_cursorRow + 1) % 5
            }
        })

        input.onButtonPressed(Button.B, function () {
            if (_isMyTurn && !_waiting && !_gameOver) {
                if (_step == 0) {
                    _step = 1
                } else {
                    radio.sendString("T," + _cursorCol + "," + _cursorRow)
                    _waiting = true
                    _step = 0
                }
            }
        })

        input.onButtonPressed(Button.AB, function () {
            _isMyTurn = true
            if (_gameOver) {
                reset()
                _setupCb()
            }
        })

        radio.onReceivedString(function (msg) {
            if (_gameOver) return
            let list = msg.split(",")
            if (list[0] == "T") {
                _shotCb(toIndex(parseInt(list[1]), parseInt(list[2])))
                if (!_gameOver) {
                    _isMyTurn = true
                    _waiting = false
                }
            } else if (list[0] == "R") {
                let r = list[1]
                if (r == "WIN") {
                    basic.showIcon(IconNames.Happy)
                    basic.pause(500)
                    basic.clearScreen()
                    basic.showString("WIN")
                    _gameOver = true
                } else if (r == "HIT") {
                    basic.showIcon(IconNames.Yes)
                    _hits.push(toIndex(_cursorCol, _cursorRow))
                    _isMyTurn = false
                    _waiting = false
                } else {
                    basic.showIcon(IconNames.SmallSquare)
                    _isMyTurn = false
                    _waiting = false
                }
                basic.pause(500)
            }
        })

        basic.forever(function () {
            if (!_waiting && !_gameOver) _drawCb()
        })
    }
}