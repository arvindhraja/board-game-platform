class StandardChessClient {
    constructor(socket, roomId, timeControl) {
        this.socket = socket;
        this.roomId = roomId;
        this.timeControl = timeControl;
        this.boardEl = document.getElementById('game-board-area');
        this.chess = new Chess();
        this.orientation = 'white';

        this.selectedSquare = null;
        this.legalMoves = [];
        this.lastMove = null;

        this.squares = {}; // Map 'e4' -> DOM Element
    }

    init() {
        this.boardEl.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                <div class="player-info" style="width: 100%; max-width: 600px; display: flex; justify-content: space-between; margin-bottom: 5px; color: #ccc;">
                    <span>Black</span>
                    <span id="opponent-timer" class="timer" style="background: #222; padding: 2px 8px; border-radius: 4px; min-width: 50px; text-align: center;">--:--</span>
                </div>
                
                <div id="chess-board" class="chess-board"></div>
                
                <div class="player-info" style="width: 100%; max-width: 600px; display: flex; justify-content: space-between; margin-top: 5px; color: #ccc;">
                    <span>White</span>
                    <span id="player-timer" class="timer" style="background: #222; padding: 2px 8px; border-radius: 4px; min-width: 50px; text-align: center;">--:--</span>
                </div>
                 <div id="game-status" style="margin-top: 10px; color: #aaa; font-style: italic; min-height: 20px;"></div>
            </div>
        `;
        this.chessBoard = document.getElementById('chess-board');
        this.initialRender();
        this.setupEventListeners();
        console.log('Standard Chess Initialized');

        this.socket.emit('gameAction', { roomId: this.roomId, action: 'getState' });
    }

    initialRender() {
        this.chessBoard.innerHTML = '';
        this.squares = {};

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');

                const sqName = this.toSquare(row, col);
                square.dataset.square = sqName;
                this.squares[sqName] = square;

                // Coordinations
                if (col === 0) {
                    const rank = document.createElement('span');
                    rank.innerText = 8 - row;
                    rank.style.cssText = "position: absolute; top: 2px; left: 2px; font-size: 10px; font-weight: bold; opacity: 0.5; color: inherit;";
                    square.appendChild(rank);
                }
                if (row === 7) {
                    const file = document.createElement('span');
                    file.innerText = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][col];
                    file.style.cssText = "position: absolute; bottom: 0px; right: 2px; font-size: 10px; font-weight: bold; opacity: 0.5; color: inherit;";
                    square.appendChild(file);
                }

                this.chessBoard.appendChild(square);
            }
        }
    }

    renderPieces() {
        // Clear logic: remove pieces and hints
        Object.values(this.squares).forEach(sq => {
            const kids = Array.from(sq.children);
            kids.forEach(k => {
                if (k.classList.contains('piece') || k.classList.contains('legal-hint') || k.classList.contains('capture-hint')) {
                    k.remove();
                }
            });
            sq.classList.remove('last-move', 'selected', 'check');
            sq.style.background = ''; // reset check gradient override
        });

        // Place Pieces
        const board = this.chess.board();
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const sqName = this.toSquare(row, col);
                    const square = this.squares[sqName];

                    const img = document.createElement('img');
                    img.src = `assets/pieces/${piece.color}${piece.type.toLowerCase()}.svg`;
                    img.classList.add('piece');
                    square.appendChild(img);
                }
            }
        }

        // Highlights
        if (this.lastMove) {
            if (this.squares[this.lastMove.from]) this.squares[this.lastMove.from].classList.add('last-move');
            if (this.squares[this.lastMove.to]) this.squares[this.lastMove.to].classList.add('last-move');
        }

        if (this.selectedSquare && this.squares[this.selectedSquare]) {
            this.squares[this.selectedSquare].classList.add('selected');

            this.legalMoves.forEach(move => {
                const targetSq = this.squares[move.to];
                if (targetSq) {
                    const hint = document.createElement('div');
                    if (move.captured || move.flags.includes('e')) {
                        hint.classList.add('capture-hint');
                    } else {
                        hint.classList.add('legal-hint');
                    }
                    targetSq.appendChild(hint);
                }
            });
        }

        // Check Highlight
        if (this.chess.inCheck()) {
            const boardRef = this.chess.board();
            const turn = this.chess.turn();
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = boardRef[r][c];
                    if (p && p.type === 'k' && p.color === turn) {
                        const kSq = this.squares[this.toSquare(r, c)];
                        kSq.classList.add('check');
                        kSq.style.background = 'radial-gradient(circle, #ff6b6b 0%, transparent 80%)';
                    }
                }
            }
        }
    }

    toSquare(row, col) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return files[col] + (8 - row);
    }

    setupEventListeners() {
        this.chessBoard.addEventListener('click', (e) => {
            const squareEl = e.target.closest('.square');
            if (!squareEl) return;
            this.handleSquareClick(squareEl.dataset.square);
        });
    }

    handleSquareClick(square) {
        if (this.selectedSquare === square) {
            this.deselect();
            return;
        }

        // Standardize move object check
        const move = this.legalMoves.find(m => m.to === square);
        if (move) {
            this.makeMove(move);
            return;
        }

        const piece = this.chess.get(square);
        if (piece && piece.color === this.chess.turn()) {
            this.selectSquare(square);
        } else {
            this.deselect();
        }
    }

    selectSquare(square) {
        this.selectedSquare = square;
        this.legalMoves = this.chess.moves({ square: square, verbose: true });
        this.renderPieces();
    }

    deselect() {
        this.selectedSquare = null;
        this.legalMoves = [];
        this.renderPieces();
    }

    makeMove(move) {
        this.socket.emit('gameAction', {
            roomId: this.roomId,
            action: 'move',
            data: { from: move.from, to: move.to, promotion: 'q' }
        });
        this.deselect();
    }

    updateState(data) {
        if (data.fen) {
            this.chess.load(data.fen);
        }

        if (data.lastMove) {
            this.lastMove = data.lastMove;
            if (window.playSound) {
                if (data.checkmate || data.check) window.playSound('check');
                else if (data.lastMove.captured || data.lastMove.flags.includes('c')) window.playSound('capture');
                else window.playSound('move');

                if (data.gameOver) setTimeout(() => window.playSound('game-end'), 1000);
            }
        }

        if (data.timeLeft) this.updateTimers(data.timeLeft);

        this.renderPieces();
        this.updateStatus(data);
    }

    updateStatus(data) {
        const statusEl = document.getElementById('game-status');
        if (statusEl) {
            if (data.gameOver) {
                const winner = data.winner === 'w' ? 'White' : (data.winner === 'b' ? 'Black' : 'Draw');
                statusEl.innerText = data.checkmate ? `Checkmate! ${winner} wins.` : `Game Over (${data.reason || 'Draw'})`;
            } else {
                const turnText = this.chess.turn() === 'w' ? "White's Turn" : "Black's Turn";
                statusEl.innerText = data.check ? `Check! ${turnText}` : turnText;
            }
        }
    }

    updateTimers(timeLeft) {
        if (!timeLeft) return;
        const fmt = (ms) => {
            if (ms < 0) ms = 0;
            const totalSec = Math.floor(ms / 1000);
            const m = Math.floor(totalSec / 60);
            const s = totalSec % 60;
            return `${m}:${s.toString().padStart(2, '0')}`;
        };
        const opTime = document.getElementById('opponent-timer');
        const myTime = document.getElementById('player-timer');

        // Simple assignment: Black=Top, White=Bottom (Standard orientation)
        if (opTime) {
            opTime.innerText = fmt(timeLeft.b);
            if (this.chess.turn() === 'b') opTime.style.color = '#fff'; else opTime.style.color = '#777';
        }

        if (myTime) {
            myTime.innerText = fmt(timeLeft.w);
            if (this.chess.turn() === 'w') myTime.style.color = '#fff'; else myTime.style.color = '#777';
        }
    }
}

window.StandardChessClient = StandardChessClient;
