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

    getPlayerColor(playerId) {
        if (this.players.white === playerId) return 'w';
        if (this.players.black === playerId) return 'b';
        return null;
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

    startTimer() {
        this.active = true;
        this.lastMoveTime = Date.now();
    }

    processAction(playerId, action, data) {
        if (action === 'getState') {
            return this.getState();
        }

        if (action === 'move') {
            if (this.gameOver) return null;

            // Identity check
            let playerColor = this.getPlayerColor(playerId);
            const currentTurn = this.chess.turn();

            // AI Override
            if (playerId && playerId.startsWith('AI_BOT')) {
                playerColor = currentTurn;
            }

            if (!playerColor || playerColor !== currentTurn) {
                return null; // Not allowed / Not your turn
            }

            try {
                // Timer Logic
                if (this.active && this.timeControl > 0) {
                    const now = Date.now();
                    const delta = now - this.lastMoveTime;
                    this.timeLeft[currentTurn] -= delta;
                    if (this.timeLeft[currentTurn] < 0) {
                        this.timeLeft[currentTurn] = 0;
                        this.gameOver = true;
                        this.winner = (currentTurn === 'w' ? 'b' : 'w');
                        return {
                            gameOver: true,
                            winner: this.winner,
                            reason: 'timeout',
                            timeLeft: this.timeLeft
                        };
                    }
                }

                const move = this.chess.move(data);
                if (move) {
                    this.lastMoveTime = Date.now();
                    if (!this.active) this.active = true; // Start game on first move if not started

                    const isGameOver = this.chess.isGameOver();
                    let winner = null;
                    let reason = null;

                    if (isGameOver) {
                        this.gameOver = true;
                        if (this.chess.isCheckmate()) {
                            // Turn has swapped to loser. Winner is previous turn.
                            winner = (this.chess.turn() === 'w' ? 'b' : 'w');
                            reason = 'Checkmate';
                        } else {
                            winner = 'Draw';
                            if (this.chess.isStalemate()) reason = 'Stalemate';
                            else if (this.chess.isThreefoldRepetition()) reason = 'Repetition';
                            else if (this.chess.isInsufficientMaterial()) reason = 'Insufficient Material';
                            else reason = 'Draw';
                        }
                        this.winner = winner;
                    }

                    return {
                        fen: this.chess.fen(),
                        turn: this.chess.turn(),
                        lastMove: move,
                        gameOver: this.gameOver,
                        winner: this.winner,
                        reason: reason,
                        check: this.chess.inCheck(),
                        history: this.chess.history({ verbose: true }),
                        timeLeft: this.timeLeft
                    };
                }
            } catch (e) {
                console.error("Chess Move Error:", e);
                return null;
            }
        }
        return null;
    }

    getGameOverReason() {
        if (this.chess.isCheckmate()) return 'Checkmate';
        if (this.chess.isStalemate()) return 'Stalemate';
        if (this.chess.isThreefoldRepetition()) return 'Repetition';
        if (this.chess.isInsufficientMaterial()) return 'Insufficient Material';
        if (this.chess.isDraw()) return 'Draw';
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

    getHistory() {
        return this.chess.history({ verbose: true });
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
