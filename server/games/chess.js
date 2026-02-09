const { Chess } = require('chess.js');

class ChessGame {
    constructor(timeControl) {
        this.chess = new Chess();
        this.players = { white: null, black: null };
        this.timeControl = timeControl ? parseInt(timeControl) * 60 * 1000 : 0;
        this.timeLeft = { w: this.timeControl, b: this.timeControl };
        this.lastMoveTime = Date.now();
        this.gameOver = false;
        this.winner = null;
        this.active = false; // Game starts when 2 players join? Or on first move? usually first move or both ready. Let's say first move starts timer.
    }

    assignPlayer(playerId, playerIndex) {
        if (!this.players.white) {
            this.players.white = playerId;
            return 'w';
        } else if (!this.players.black) {
            this.players.black = playerId;
            // Game can technically start accepting moves now
            return 'b';
        }
        return null; // Spectator
    }

    processAction(playerId, action, data) {
        if (action === 'getState') {
            return this.getState();
        }

        if (action === 'move') {
            if (this.gameOver) return null;

            const { from, to, promotion } = data;
            const turn = this.chess.turn(); // 'w' or 'b'
            const playerColor = this.players.white === playerId ? 'w' : (this.players.black === playerId ? 'b' : null);

            if (turn !== playerColor) {
                throw new Error('Not your turn');
            }

            try {
                // Timer Logic: Calculate time used
                if (this.timeControl > 0 && this.active) {
                    const now = Date.now();
                    const delta = now - this.lastMoveTime;
                    this.timeLeft[turn] -= delta;
                    if (this.timeLeft[turn] < 0) this.timeLeft[turn] = 0;
                    this.lastMoveTime = now;
                }

                const move = this.chess.move({ from, to, promotion: promotion || 'q' });
                if (move) {
                    if (!this.active) {
                        this.active = true;
                        this.lastMoveTime = Date.now();
                    }

                    return {
                        fen: this.chess.fen(),
                        turn: this.chess.turn(),
                        lastMove: move,
                        check: this.chess.inCheck(),
                        checkmate: this.chess.isCheckmate(),
                        draw: this.chess.isDraw(),
                        gameOver: this.chess.isGameOver(),
                        timeLeft: this.timeLeft
                    };
                }
            } catch (e) {
                throw new Error('Invalid move');
            }
        }
        return null;
    }

    onTimerTick() {
        if (!this.active || this.gameOver || this.timeControl === 0) return null;

        const turn = this.chess.turn();
        const now = Date.now();
        const delta = now - this.lastMoveTime;
        const currentRemaining = this.timeLeft[turn] - delta;

        if (currentRemaining <= 0) {
            this.gameOver = true;
            this.timeLeft[turn] = 0;
            this.winner = turn === 'w' ? 'b' : 'w'; // Opponent wins
            return {
                gameOver: true,
                winner: this.winner,
                reason: 'timeout',
                timeLeft: this.timeLeft
            };
        }

        // We don't need to emit every tick, client can interpolate.
        // But GameManager calls this every second, so we might as well sync occasionally or just check for timeout.
        // Let's only return if timeout. Or maybe every 5-10s to sync?
        // Basic implementation: Client counts down. Server enforces. 
        // We only return result if Game Over.
        return null;
    }

    getState() {
        return {
            fen: this.chess.fen(),
            turn: this.chess.turn(),
            players: this.players,
            timeLeft: this.timeLeft,
            active: this.active,
            gameOver: this.gameOver,
            winner: this.winner,
            timeControl: this.timeControl
        };
    }
}

module.exports = ChessGame;
