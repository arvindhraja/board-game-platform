class FourPlayerChessClient {
    constructor(socket, roomId) {
        this.socket = socket;
        this.roomId = roomId;
        this.boardEl = document.getElementById('game-board-area');
        this.draggedPiece = null;
        this.boardState = []; // local cache
    }

    init() {
        this.boardEl.innerHTML = '<div id="four-chess-board" class="four-chess-board"></div>';
        this.chessBoard = document.getElementById('four-chess-board');
        // Initial render logic... 
        // We need initial state from server? or assume standard start?
        // Server sends state on join?
        // Let's request state or wait for update.
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
                    square.classList.add('four-square'); // Used for invalid transparency
                    square.classList.add('invalid');
                    square.style.visibility = 'hidden';
                } else {
                    // Color pattern
                    if ((r + c) % 2 === 0) square.classList.add('light');
                    else square.classList.add('dark');
                }

                const piece = boardData[r][c];
                if (piece) {
                    const img = document.createElement('img');

                    // Logic: Map 'red' to 'w' assets with filter, 'blue' to 'b' assets with filter
                    // 'white' -> 'w', 'black' -> 'b'
                    let prefix = 'w';
                    if (piece.color === 'black' || piece.color === 'blue') prefix = 'b';

                    img.src = `assets/pieces/${prefix}${piece.type.toLowerCase()}.svg`;

                    // Apply filters for Red and Blue
                    if (piece.color === 'red') {
                        img.style.filter = 'sepia(1) saturate(5) hue-rotate(-50deg)'; // Red-ish tint
                    } else if (piece.color === 'blue') {
                        img.style.filter = 'sepia(1) saturate(5) hue-rotate(180deg)'; // Blue-ish tint
                    }

                    img.classList.add('piece');
                    img.draggable = true;
                    square.appendChild(img);
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
    }
}

window.FourPlayerChessClient = FourPlayerChessClient;
