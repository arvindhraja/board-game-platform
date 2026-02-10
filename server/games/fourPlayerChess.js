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
        this.history = [];
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

    getPlayerColor(playerId) {
        for (const [color, id] of Object.entries(this.players)) {
            if (id === playerId) return color;
        }
        return null;
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
                players: this.players,
                history: this.history
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
                    winner: this.winner,
                    history: this.history,
                    lastMove: { from, to, color: colorToValidate }
                };
            }
        }
        return null;
    }

    isValidMove(from, to, color) {
        if (!this.isValidSquare(to)) return false;

        const piece = this.board[from.r][from.c];
        if (!piece || piece.color !== color) return false;

        const target = this.board[to.r][to.c];
        if (target && target.color === color) return false; // Friendly fire

        const dr = to.r - from.r;
        const dc = to.c - from.c;
        const absDr = Math.abs(dr);
        const absDc = Math.abs(dc);

        switch (piece.type) {
            case 'P': return this.isValidPawnMove(from, to, piece, target);
            case 'R': return (dr === 0 || dc === 0) && this.isPathClear(from, to);
            case 'B': return (absDr === absDc) && this.isPathClear(from, to);
            case 'Q': return (dr === 0 || dc === 0 || absDr === absDc) && this.isPathClear(from, to);
            case 'N': return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
            case 'K': return absDr <= 1 && absDc <= 1;
            default: return false;
        }
    }

    isValidSquare(pos) {
        if (pos.r < 0 || pos.r >= 14 || pos.c < 0 || pos.c >= 14) return false;
        return this.board[pos.r][pos.c] !== 'X';
    }

    getForwardVec(color) {
        switch (color) {
            case 'white': return { r: -1, c: 0 };
            case 'black': return { r: 1, c: 0 };
            case 'red': return { r: 0, c: 1 };
            case 'blue': return { r: 0, c: -1 };
            default: return { r: 0, c: 0 };
        }
    }

    isValidPawnMove(from, to, piece, target) {
        const fwd = this.getForwardVec(piece.color);
        const dr = to.r - from.r;
        const dc = to.c - from.c;

        // Forward 1
        if (dr === fwd.r && dc === fwd.c) {
            return !target; // Must be empty
        }

        // Forward 2 (if unmoved)
        if (!piece.moved && dr === fwd.r * 2 && dc === fwd.c * 2) {
            const mid = { r: from.r + fwd.r, c: from.c + fwd.c };
            return !target && !this.board[mid.r][mid.c];
        }

        // Capture (Diagonal forward)
        let isForwardPart = false;
        let isSidewaysPart = false;

        if (fwd.r !== 0) { // Moving vertically (White/Black)
            isForwardPart = (dr === fwd.r);
            isSidewaysPart = (Math.abs(dc) === 1);
        } else { // Moving horizontally (Red/Blue)
            isForwardPart = (dc === fwd.c);
            isSidewaysPart = (Math.abs(dr) === 1);
        }

        if (isForwardPart && isSidewaysPart) {
            return target && target.color !== piece.color;
        }

        return false;
    }

    isPathClear(from, to) {
        const dr = Math.sign(to.r - from.r);
        const dc = Math.sign(to.c - from.c);
        let curr = { r: from.r + dr, c: from.c + dc };

        while (curr.r !== to.r || curr.c !== to.c) {
            if (this.board[curr.r][curr.c] !== null) return false;
            curr.r += dr;
            curr.c += dc;
        }
        return true;
    }

    executeMove(from, to, color) {
        const piece = this.board[from.r][from.c];
        const target = this.board[to.r][to.c];

        // History
        const notation = `${piece.type}${String.fromCharCode(97 + from.c)}${14 - from.r}-${String.fromCharCode(97 + to.c)}${14 - to.r}`;
        this.history.push({
            color: piece.color,
            from: { r: from.r, c: from.c },
            to: { r: to.r, c: to.c },
            piece: piece.type,
            captured: target ? target.type : null,
            san: notation
        });

        this.board[to.r][to.c] = piece;
        this.board[from.r][from.c] = null;
        piece.moved = true;

        // King Capture Elimination
        if (target && target.type === 'K') {
            this.eliminated.push(target.color);
            // Check Win Condition
            const active = this.turnOrder.filter(c => !this.eliminated.includes(c));
            if (active.length === 1) {
                this.gameOver = true;
                this.winner = active[0];
            }
        }
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

    generateMoves(color) {
        const moves = [];
        for (let r = 0; r < 14; r++) {
            for (let c = 0; c < 14; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === color) {
                    const from = { r, c };
                    // Generate candidates based on piece type
                    const candidates = this.getCandidates(from, piece);
                    candidates.forEach(to => {
                        if (this.isValidMove(from, to, color)) {
                            // Add to moves. Tag if capture.
                            const target = this.board[to.r][to.c];
                            moves.push({
                                from, to,
                                isCapture: !!target,
                                // Simple Score: Capture=10. Center=1?
                                weight: target ? 10 : Math.random() // Randomize equals
                            });
                        }
                    });
                }
            }
        }
        return moves.sort((a, b) => b.weight - a.weight);
    }

    getCandidates(from, piece) {
        const candidates = [];
        const add = (r, c) => candidates.push({ r, c });

        // Simple candidate generation (doesn't check validity, just geometry)
        if (piece.type === 'P') {
            const fwd = this.getForwardVec(piece.color);
            add(from.r + fwd.r, from.c + fwd.c); // Move 1
            add(from.r + fwd.r * 2, from.c + fwd.c * 2); // Move 2
            add(from.r + fwd.r, from.c + fwd.c - 1); // Cap L
            add(from.r + fwd.r, from.c + fwd.c + 1); // Cap R
            // Rotate logic for horizontal players?
            // getForwardVec handles r/c. 
            // My Pawn logic in isValidMove handles orientation.
            // But here I need to generate 'diagonal' candidates.
            if (fwd.r !== 0) { // Vertical
                add(from.r + fwd.r, from.c - 1);
                add(from.r + fwd.r, from.c + 1);
            } else { // Horizontal
                add(from.r - 1, from.c + fwd.c);
                add(from.r + 1, from.c + fwd.c);
            }
        } else if (piece.type === 'N') {
            const jumps = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]];
            jumps.forEach(j => add(from.r + j[0], from.c + j[1]));
        } else if (piece.type === 'K') {
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(from.r + dr, from.c + dc);
        } else {
            // Sliding (R, B, Q) - scan lines? 
            // Just generating geometry is fast. 'isValidMove' checks path.
            // But iterating 14x14 is slow if we do it stupidly.
            // Let's generate rays until board edge.
            const dirs = [];
            if (piece.type === 'R' || piece.type === 'Q') dirs.push([0, 1], [0, -1], [1, 0], [-1, 0]);
            if (piece.type === 'B' || piece.type === 'Q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);

            dirs.forEach(d => {
                let curr = { r: from.r + d[0], c: from.c + d[1] };
                while (this.isValidSquare(curr)) {
                    add(curr.r, curr.c);
                    // If blocked, stop?
                    // Optimization: Stop adding candidates if blocked, to save isValidMove calls.
                    if (this.board[curr.r][curr.c]) break; // Hit something
                    curr.r += d[0]; curr.c += d[1];
                }
            });
        }
        return candidates;
    }

    getPlayerColor(playerId) {
        for (const [color, id] of Object.entries(this.players)) {
            if (id === playerId) return color;
        }
        return null;
    }
}

module.exports = FourPlayerChess;
