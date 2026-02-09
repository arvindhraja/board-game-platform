class StandardChessClient {
    constructor(socket, roomId) {
        this.socket = socket;
        this.roomId = roomId;
        this.boardEl = document.getElementById('game-board-area');
        this.chess = new Chess(); // Local validation
        this.orientation = 'white'; // default
        this.draggedPiece = null;
    }

    init() {
        this.boardEl.innerHTML = '<div id="chess-board" class="chess-board"></div>';
        this.chessBoard = document.getElementById('chess-board');
        this.renderBoard();
        this.setupEventListeners();
        console.log('Standard Chess Initialized');
    }

    renderBoard() {
        this.chessBoard.innerHTML = '';
        const board = this.chess.board(); // 8x8 array

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
                square.dataset.square = this.toSquare(row, col);

                const piece = board[row][col];
                if (piece) {
                    const img = document.createElement('img');
                    img.src = `assets/pieces/${piece.color}${piece.type}.svg`;
                    img.classList.add('piece');
                    img.draggable = true;
                    img.dataset.square = this.toSquare(row, col);
                    square.appendChild(img);
                }

                this.chessBoard.appendChild(square);
            }
        }
    }

    toSquare(row, col) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return files[col] + (8 - row);
    }

    setupEventListeners() {
        this.chessBoard.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('piece')) {
                this.draggedPiece = e.target;
                e.dataTransfer.setData('text/plain', e.target.dataset.square);
                e.target.style.opacity = '0.5';
            }
        });

        this.chessBoard.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('piece')) {
                e.target.style.opacity = '1';
                this.draggedPiece = null;
            }
        });

        this.chessBoard.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.chessBoard.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetSquare = e.target.closest('.square').dataset.square;
            const sourceSquare = e.dataTransfer.getData('text/plain');

            if (sourceSquare && targetSquare && sourceSquare !== targetSquare) {
                this.attemptMove(sourceSquare, targetSquare);
            }
        });
    }

    attemptMove(from, to) {
        // Optimistic UI update or validate first?
        // Let's validate locally then send
        const move = this.chess.move({ from, to, promotion: 'q' }); // assume queen promotion for now

        if (move) {
            this.chess.undo(); // Undo local move, wait for server confirmation
            this.socket.emit('gameAction', {
                roomId: this.roomId,
                action: 'move',
                data: { from, to, promotion: 'q' }
            });
        }
    }

    updateState(data) {
        if (data.fen) {
            this.chess.load(data.fen);
            this.renderBoard();
        }
    }
}

// Make globally available
window.StandardChessClient = StandardChessClient;
