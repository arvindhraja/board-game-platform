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
                    img.src = `/assets/pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
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
        this.renderHistory();
        this.updateStatus(data);
    }

    renderHistory() {
        const historyEl = document.getElementById('moves-list');
        if (!historyEl) return;
        historyEl.innerHTML = '';

        const history = this.chess.history({ verbose: true });
        for (let i = 0; i < history.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const wMove = history[i];
            const bMove = history[i + 1];

            const numDiv = document.createElement('div');
            numDiv.innerText = moveNumber + '.';
            numDiv.style.color = '#888';

            const wDiv = document.createElement('div');
            wDiv.innerText = wMove.san;
            wDiv.style.color = '#fff';

            const bDiv = document.createElement('div');
            if (bMove) {
                bDiv.innerText = bMove.san;
                bDiv.style.color = '#fff';
            }

            historyEl.appendChild(numDiv);
            historyEl.appendChild(wDiv);
            historyEl.appendChild(bDiv || document.createElement('div'));
        }

        const panel = document.getElementById('history-panel');
        if (panel) panel.scrollTop = panel.scrollHeight;
    }

    updateStatus(data) {
        const statusEl = document.getElementById('game-status');
        if (statusEl) {
            const turnText = this.chess.turn() === 'w' ? "White's Turn" : "Black's Turn";
            if (data.gameOver) {
                let winner = 'Draw';
                if (data.winner === 'w') winner = 'White';
                else if (data.winner === 'b') winner = 'Black';

                const reason = data.reason || (data.checkmate ? 'Checkmate' : 'Game Over');
                let message = `${winner === 'Draw' ? 'Game Drawn' : winner + ' Wins'} by ${reason}`;

                statusEl.innerText = message;

                // Popup (Prevent duplicates)
                if (!document.getElementById('game-over-modal')) {
                    const overlay = document.createElement('div');
                    overlay.id = 'game-over-modal';
                    overlay.style.cssText = `
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center;
                        z-index: 2000; flex-direction: column; animation: fadeIn 0.5s;
                    `;
                    overlay.innerHTML = `
                        <div style="background: #2a2a2a; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #444; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                            <h1 style="color: #ffd700; font-size: 3rem; margin: 0 0 10px 0;">${winner === 'Draw' ? 'Draw!' : winner + ' Wins!'}</h1>
                            <p style="color: #ccc; font-size: 1.2rem; margin-bottom: 30px;">${reason}</p>
                            <button onclick="this.closest('#game-over-modal').remove()" 
                                style="padding: 12px 30px; font-size: 1.1rem; cursor: pointer; background: #e74c3c; color: #fff; border: none; border-radius: 6px; font-weight: bold; transition: background 0.2s;">
                                Close
                            </button>
                        </div>
                    `;
                    document.body.appendChild(overlay);
                }
            } else {
                statusEl.innerText = data.check ? `Check! ${turnText}` : turnText;
                statusEl.style.color = data.check ? '#ff6b6b' : '#aaa';

                if (data.check) {
                    this.showToast('Check!');
                }
            }
        }
    }

    showToast(msg) {
        const toast = document.createElement('div');
        toast.innerText = msg;
        toast.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,0,0,0.8); color: white; padding: 20px 40px; font-size: 2rem; border-radius: 10px; pointer-events: none; z-index: 1000; animation: fadeOut 2s forwards;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
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
