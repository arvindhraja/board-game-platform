class FourPlayerChessClient {
    constructor(socket, roomId) {
        this.socket = socket;
        this.roomId = roomId;
        this.boardEl = document.getElementById('game-board-area');
        this.draggedPiece = null;
        this.boardState = []; // local cache
    }

    init() {
        this.boardEl.innerHTML = `
            <div id="game-status" style="text-align: center; font-size: 1.2rem; margin-bottom: 10px; color: #fff;">Waiting...</div>
            <div id="four-chess-board" class="four-chess-board"></div>
        `;
        this.chessBoard = document.getElementById('four-chess-board');
        this.socket.emit('gameAction', { roomId: this.roomId, action: 'getState' });
        this.setupEventListeners();
        console.log('Four Player Chess Initialized');
    }

    renderBoard(boardData) {
        this.chessBoard.innerHTML = '';
        if (!boardData) return;

        for (let r = 0; r < 14; r++) {
            for (let c = 0; c < 14; c++) {
                const square = document.createElement('div');
                square.classList.add('square'); // Unified square class for size
                square.dataset.r = r;
                square.dataset.c = c;

                // Handle invalid corners
                if (this.isInvalidSquare(r, c)) {
                    square.classList.add('four-square');
                    square.classList.add('invalid');
                    square.style.visibility = 'hidden';
                } else {
                    // Color pattern
                    if ((r + c) % 2 === 0) square.classList.add('light');
                    else square.classList.add('dark');

                    const piece = boardData[r][c];
                    if (piece) {
                        const img = document.createElement('img');

                        let prefix = 'w';
                        if (piece.color === 'black' || piece.color === 'blue') prefix = 'b';

                        img.src = `assets/pieces/${prefix}${piece.type.toLowerCase()}.svg`;

                        // Apply filters for Red and Blue
                        if (piece.color === 'red') {
                            img.style.filter = 'sepia(1) saturate(5) hue-rotate(-50deg) drop-shadow(2px 4px 6px rgba(0,0,0,0.4))';
                        } else if (piece.color === 'blue') {
                            img.style.filter = 'sepia(1) saturate(5) hue-rotate(180deg) drop-shadow(2px 4px 6px rgba(0,0,0,0.4))';
                        } else {
                            // Standard shadow for white/black
                            img.style.filter = 'drop-shadow(2px 4px 6px rgba(0,0,0,0.4))';
                        }

                        img.classList.add('piece');
                        img.draggable = true;
                        square.appendChild(img);
                    }
                }
                this.chessBoard.appendChild(square);
            }
        }
    }

    isInvalidSquare(r, c) {
        if (r < 3 && c < 3) return true; // TL
        if (r < 3 && c > 10) return true; // TR
        if (r > 10 && c < 3) return true; // BL
        if (r > 10 && c > 10) return true; // BR
        return false;
    }

    setupEventListeners() {
        this.chessBoard.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('piece')) {
                this.draggedPiece = e.target;
                const sq = e.target.parentElement;
                e.dataTransfer.setData('text/plain', JSON.stringify({ r: sq.dataset.r, c: sq.dataset.c }));
                e.target.style.opacity = '0.5';
            }
        });

        this.chessBoard.addEventListener('dragend', (e) => {
            if (e.target) e.target.style.opacity = '1';
            this.draggedPiece = null;
        });

        this.chessBoard.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.chessBoard.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetSq = e.target.closest('.square');
            if (!targetSq) return;

            const fromData = JSON.parse(e.dataTransfer.getData('text/plain'));
            const toData = { r: targetSq.dataset.r, c: targetSq.dataset.c };

            if (fromData.r !== toData.r || fromData.c !== toData.c) {
                this.socket.emit('gameAction', {
                    roomId: this.roomId,
                    action: 'move',
                    data: { from: fromData, to: toData }
                });
            }
        });
    }

    updateState(data) {
        if (data.board) {
            this.boardState = data.board;
            this.renderBoard(data.board);
        }

        if (data.turn) {
            const statusEl = document.getElementById('game-status');
            if (statusEl) {
                statusEl.innerText = `Turn: ${data.turn.toUpperCase()}`;
                if (data.turn === 'white') statusEl.style.color = '#fff';
                else if (data.turn === 'red') statusEl.style.color = '#ff6b6b';
                else if (data.turn === 'black') statusEl.style.color = '#aaa';
                else if (data.turn === 'blue') statusEl.style.color = '#4dabf7';
            }
        }

        if (data.history) this.renderHistory(data.history);

        if (data.gameOver && !this.gameOverShown) {
            this.gameOverShown = true;
            const winner = data.winner ? data.winner.toUpperCase() : 'Draw';

            const overlay = document.createElement('div');
            overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 2000; flex-direction: column; animation: fadeIn 0.5s;";
            overlay.innerHTML = `
                 <h1 style="color: #ffd700; font-size: 3rem; margin-bottom: 20px;">${winner} Wins!</h1>
                 <button onclick="this.parentElement.remove()" style="padding: 10px 30px; font-size: 1.2rem; cursor: pointer; background: #4caf50; color: #fff; border: none; border-radius: 5px;">Close</button>
             `;
            document.body.appendChild(overlay);
        }
    }

    renderHistory(history) {
        const historyEl = document.getElementById('moves-list');
        if (!historyEl) return;
        historyEl.innerHTML = '';

        history.forEach((move, i) => {
            const div = document.createElement('div');
            div.innerText = `${i + 1}. ${move.san || 'Move'}`;
            div.style.marginBottom = '2px';

            if (move.color === 'white') div.style.color = '#fff';
            else if (move.color === 'red') div.style.color = '#ff6b6b';
            else if (move.color === 'black') div.style.color = '#aaa';
            else if (move.color === 'blue') div.style.color = '#4dabf7';

            historyEl.appendChild(div);
        });

        const panel = document.getElementById('history-panel');
        if (panel) panel.scrollTop = panel.scrollHeight;
    }
}

window.FourPlayerChessClient = FourPlayerChessClient;
