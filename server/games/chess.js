const { Chess } = require('chess.js');

class ChessGame {
    constructor() {
        this.chess = new Chess();
        this.players = { white: null, black: null };
    }

    assignPlayer(playerId, playerIndex) {
        if (!this.players.white) {
            this.players.white = playerId;
            return 'w';
        } else if (!this.players.black) {
            this.players.black = playerId;
            return 'b';
        }
        return null; // Spectator
    }

    processAction(playerId, action, data) {
        if (action === 'getState') {
            return this.getState();
        }

        if (action === 'move') {
            const { from, to, promotion } = data;
            const turn = this.chess.turn(); // 'w' or 'b'
            const playerColor = this.players.white === playerId ? 'w' : (this.players.black === playerId ? 'b' : null);

            if (turn !== playerColor) {
                throw new Error('Not your turn');
            }

            try {
                const move = this.chess.move({ from, to, promotion: promotion || 'q' });
                if (move) {
                    return {
                        fen: this.chess.fen(),
                        turn: this.chess.turn(),
                        lastMove: move,
                        check: this.chess.inCheck(),
                        checkmate: this.chess.isCheckmate(),
                        draw: this.chess.isDraw(),
                        gameOver: this.chess.isGameOver(),
                    };
                }
            } catch (e) {
                throw new Error('Invalid move');
            }
        }
        return null;
    }

    getState() {
        return {
            fen: this.chess.fen(),
            turn: this.chess.turn(),
            players: this.players
        };
    }
}

module.exports = ChessGame;
