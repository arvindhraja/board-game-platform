class CarromClient {
    constructor(socket, roomId) {
        this.socket = socket;
        this.roomId = roomId;
        this.boardEl = document.getElementById('game-board-area');
        this.ctx = null;
        this.canvas = null;

        // Game State
        this.coins = [];
        this.striker = { x: 400, y: 140, r: 15, color: '#FFD700', active: true };
        this.isMyTurn = false;

        // Input Handling
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
    }

    init() {
        this.boardEl.innerHTML = '<canvas id="carrom-board" width="800" height="800"></canvas>';
        this.canvas = document.getElementById('carrom-board');
        this.ctx = this.canvas.getContext('2d');

        // Ask for initial state
        this.socket.emit('gameAction', { roomId: this.roomId, action: 'getState' });

        this.setupInput();
        this.startLoop();
        console.log('Carrom Initialized');
    }

    setupInput() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.isMyTurn) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if clicking striker
            const dist = Math.hypot(x - this.striker.x, y - this.striker.y);
            if (dist < 30) {
                this.isDragging = true;
                this.dragStart = { x, y };
                this.dragCurrent = { x, y };
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const rect = this.canvas.getBoundingClientRect();
                this.dragCurrent = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                this.isDragging = false;
                this.shoot();
            }
        });
    }

    shoot() {
        const dx = this.dragStart.x - this.dragCurrent.x;
        const dy = this.dragStart.y - this.dragCurrent.y;
        const power = Math.min(Math.hypot(dx, dy) * 0.15, 20); // Cap power
        const angle = Math.atan2(dy, dx);

        this.socket.emit('gameAction', {
            roomId: this.roomId,
            action: 'shoot',
            data: { angle, power, positionX: this.striker.x }
        });
    }

    updateState(data) {
        if (data.coins) this.coins = data.coins;
        if (data.striker) this.striker = data.striker;
        if (data.turn !== undefined) {
            // check if it's my turn based on player index
            // assume data.turn is an index
            // I need to know my index.
            // For now just assume always allow drag if data says so? 
            // We'll rely on server validation for now.
            this.isMyTurn = true; // simplified for testing
        }

        // If server sent events (animation steps), replay them?
        // For now, valid implementation is omitted, just state sync
    }

    startLoop() {
        requestAnimationFrame(() => this.loop());
    }

    loop() {
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 800, 800);

        // Board Background
        ctx.fillStyle = '#fdf5e6';
        ctx.fillRect(0, 0, 800, 800);

        // Pockets
        ctx.fillStyle = '#3e2723';
        const pockets = [[0, 0], [800, 0], [0, 800], [800, 800]];
        pockets.forEach(p => {
            ctx.beginPath();
            ctx.arc(p[0], p[1], 35, 0, Math.PI * 2);
            ctx.fill();
        });

        // Coins
        this.coins.forEach(c => {
            if (!c.active) return;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 14, 0, Math.PI * 2); // radius approx 14
            ctx.fillStyle = c.color === 'white' ? '#fff' : (c.color === 'black' ? '#333' : 'red');
            ctx.fill();
            ctx.stroke();
        });

        // Striker
        if (this.striker.active) {
            ctx.beginPath();
            ctx.arc(this.striker.x, this.striker.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.stroke();

            // Aim Line
            if (this.isDragging) {
                ctx.beginPath();
                ctx.moveTo(this.striker.x, this.striker.y);
                ctx.lineTo(this.striker.x + (this.dragStart.x - this.dragCurrent.x),
                    this.striker.y + (this.dragStart.y - this.dragCurrent.y));
                ctx.strokeStyle = 'red';
                ctx.stroke();
            }
        }
    }
}

window.CarromClient = CarromClient;
