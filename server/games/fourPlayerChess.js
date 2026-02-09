class FourPlayerChess {
    constructor() {
        this.boardSize = 14;
        this.players = { white: null, red: null, black: null, blue: null };
        this.turnOrder = ['white', 'red', 'black', 'blue']; // Clockwise
        this.currentTurnIndex = 0;
        this.eliminated = [];
        this.board = this.initializeBoard();
        this.gameOver = false;
        this.winner = null;
    }

    assignPlayer(playerId) {
        // Order: White, Red, Black, Blue (as per turnOrder)
        for (const color of this.turnOrder) {
            if (!this.players[color]) {
                this.players[color] = playerId;
                return color;
            }
        }
        return 'spectator';
    }

    initializeBoard() {
        // 14x14 grid, 'null' for valid empty, 'X' for invalid (corners)
        const board = Array(14).fill(null).map(() => Array(14).fill(null));

        // Mark invalid corners (3x3 cutouts)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) board[r][c] = 'X'; // Top-Left
            for (let c = 11; c < 14; c++) board[r][c] = 'X'; // Top-Right
        }
        for (let r = 11; r < 14; r++) {
            for (let c = 0; c < 3; c++) board[r][c] = 'X'; // Bottom-Left
            for (let c = 11; c < 14; c++) board[r][c] = 'X'; // Bottom-Right
        }

        // Setup pieces (simplified for brevity, standard layout)
        // White (Bottom side, rows 12,13, cols 3-10)
        this.setupArmy(board, 'white', 13, 12, 3);
        // Black (Top side, rows 0,1, cols 3-10)
        this.setupArmy(board, 'black', 0, 1, 3);
        // Red (Left side, cols 0,1, rows 3-10) - rotated logic handled by setupArmyRotated
        this.setupArmyRotated(board, 'red', 0, 1, 3);
        // Blue (Right side, cols 12,13, rows 3-10) - rotated logic handled by setupArmyRotated
        this.setupArmyRotated(board, 'blue', 13, 12, 3);

        return board;
    }

    setupArmy(board, color, backRow, pawnRow, startCol) {
        const pieces = ['R', 'N', 'B', 'K', 'Q', 'B', 'N', 'R']; // Traditional setup
        pieces.forEach((type, i) => {
            board[backRow][startCol + i] = { type, color, moved: false };
            board[pawnRow][startCol + i] = { type: 'P', color, moved: false };
        });
    }

    setupArmyRotated(board, color, backCol, pawnCol, startRow) {
        const pieces = ['R', 'N', 'B', 'K', 'Q', 'B', 'N', 'R'];
        pieces.forEach((type, i) => {
            board[startRow + i][backCol] = { type, color, moved: false };
            board[startRow + i][pawnCol] = { type: 'P', color, moved: false };
        });
    }

    processAction(playerId, action, data) {
        if (action === 'getState') {
            return {
                board: this.board,
                turn: this.turnOrder[this.currentTurnIndex],
                eliminated: this.eliminated,
                gameOver: this.gameOver,
                winner: this.winner,
                players: this.players
            };
        }

        if (action === 'move') {
            const { from, to, promotion } = data;

            // Allow single player testing
            const isTesting = (Object.values(this.players).filter(p => p !== null).length <= 1);

            if (!isTesting) {
                const playerColor = this.getPlayerColor(playerId);
                if (playerColor !== this.turnOrder[this.currentTurnIndex]) {
                    // throw new Error('Not your turn'); // Ideally throw but returning null is safer for socket
                    return null;
                }
            }

            // We need to pass the color to isValidMove. 
            const piece = this.board[from.r][from.c];
            const colorToValidate = isTesting ? (piece ? piece.color : 'white') : this.getPlayerColor(playerId);

            if (this.isValidMove(from, to, colorToValidate)) {
                this.executeMove(from, to, colorToValidate);
                this.nextTurn();

                return {
                    board: this.board,
                    turn: this.turnOrder[this.currentTurnIndex],
                    eliminated: this.eliminated,
                    gameOver: this.gameOver,
                    winner: this.winner
                };
            }
        }
        return null;
    }

    isValidMove(from, to, color) {
        // Validation Placeholder
        const piece = this.board[from.r][from.c];
        if (!piece || piece.color !== color) return false;

        // Basic check if landing on own piece
        const target = this.board[to.r][to.c];
        if (target && target.color === color) return false;

        return true;
    }

    executeMove(from, to, color) {
        const piece = this.board[from.r][from.c];
        this.board[to.r][to.c] = piece;
        this.board[from.r][from.c] = null;
        piece.moved = true;
    }

    nextTurn() {
        let nextIndex = (this.currentTurnIndex + 1) % 4;
        let loops = 0;
        // Skip eliminated players
        while (this.eliminated.includes(this.turnOrder[nextIndex]) && loops < 4) {
            nextIndex = (nextIndex + 1) % 4;
            loops++;
        }
        this.currentTurnIndex = nextIndex;
    }

    getPlayerColor(playerId) {
        for (const [color, id] of Object.entries(this.players)) {
            if (id === playerId) return color;
        }
        return null;
    }
}

module.exports = FourPlayerChess;
