class CarromClient {
    constructor(socket, roomId) {
        this.socket = socket;
        this.roomId = roomId;
        this.boardEl = document.getElementById('game-board-area');
        this.canvas = null;
        this.ctx = null;
        this.myId = socket.id;
        this.myIndex = -1;

        // Game Constants
        this.BOARD_SIZE = 800;
        this.POCKET_RADIUS = 35;
        this.COIN_RADIUS = 14;
        this.STRIKER_RADIUS = 20;
        this.FRICTION = 0.985;
        this.WALL_BOUNCE = 0.7;

        // Game State
        this.coins = [];
        this.striker = {
            x: 400, y: 660,
            vx: 0, vy: 0,
            radius: 20,
            color: '#FFD700',
            mass: 2,
            active: true,
            isDragging: false
        };

        this.turnIndex = 0;
        this.isMyTurn = false;
        this.animating = false;

        // Interaction
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };

        // Turn Logic
        this.coinsBeforeTurn = 0;
    }

    init() {
        this.boardEl.innerHTML = `
            <div style="position: relative; width: 100%; max-width: 600px; margin: 0 auto;">
                <canvas id="carrom-board" width="800" height="800" style="width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); background: #fdf5e6;"></canvas>
                <div id="game-ui" style="position: absolute; top: 10px; left: 10px; pointer-events: none;">
                     <div style="background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 4px;">
                        <span id="turn-indicator" style="font-weight: bold;">Waiting...</span>
                     </div>
                </div>
            </div>
        `;
        this.canvas = document.getElementById('carrom-board');
        this.ctx = this.canvas.getContext('2d');

        this.setupInput();

        // Animation Loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));

        console.log('Carrom Multiplayer Client Initialized');

        // Request State
        this.socket.emit('gameAction', { roomId: this.roomId, action: 'getState' });
    }

    setupInput() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const start = (e) => {
            // allow default if not on canvas? No, canvas is target
            // Prevent scrolling on touch
            if (e.target === this.canvas) e.preventDefault();
            this.handleDragStart(getPos(e));
        };
        const move = (e) => {
            if (e.target === this.canvas) e.preventDefault();
            this.handleDragMove(getPos(e));
        };
        const end = (e) => {
            this.handleDragEnd();
        };

        this.canvas.addEventListener('mousedown', start);
        this.canvas.addEventListener('touchstart', start, { passive: false });

        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, { passive: false });

        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }

    handleDragStart(pos) {
        if (!this.striker.active || this.animating || !this.isMyTurn) return;

        const dx = pos.x - this.striker.x;
        const dy = pos.y - this.striker.y;
        if (Math.hypot(dx, dy) < this.striker.radius * 2) {
            this.striker.isDragging = true;
            this.dragStart = pos;
            this.dragCurrent = pos;
        } else {
            // Slide on baseline logic
            // Only allow sliding if Y matches my baseline approximate
            // P1: y approx 660. P2: y approx 140 (if we implemented P2 view)
            // But currently I am just using absolute coords. 
            // So if I am P2, I see upside down? Or we rotate?
            // "GameSnacks polish" -> Should rotate.
            // But rotation requires context transform.
            // Simple approach: Only P1 slides near 660. P2 slides near 140.
            const myBaseY = (this.myIndex === 1) ? 140 : 660;
            if (Math.abs(pos.y - myBaseY) < 40) {
                this.striker.x = Math.max(100, Math.min(700, pos.x));
            }
        }
    }

    handleDragMove(pos) {
        if (this.striker.isDragging) {
            this.dragCurrent = pos;
        }
    }

    handleDragEnd() {
        if (this.striker.isDragging) {
            this.striker.isDragging = false;

            const dx = this.dragStart.x - this.dragCurrent.x;
            const dy = this.dragStart.y - this.dragCurrent.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 10) {
                const maxPower = 40;
                const power = Math.min(dist * 0.15, maxPower);
                const angle = Math.atan2(dy, dx);

                // Track coins before shot for rule logic
                this.coinsBeforeTurn = this.coins.filter(c => c.active && c.color === (this.myIndex === 0 ? 'white' : 'black')).length;

                // Apply locally
                this.striker.vx = Math.cos(angle) * power;
                this.striker.vy = Math.sin(angle) * power;

                this.animating = true;
                if (window.playSound) window.playSound('strike');

                // Emit to Server
                this.socket.emit('gameAction', {
                    roomId: this.roomId,
                    action: 'shoot',
                    data: { angle, power, positionX: this.striker.x }
                });
            }
        }
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 16, 2.0);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        if (!this.animating) return;

        let moving = false;
        const entities = [this.striker, ...this.coins.filter(c => c.active)];

        entities.forEach(b => {
            // Movement & Friction
            if (Math.abs(b.vx) > 0.1 || Math.abs(b.vy) > 0.1) {
                moving = true;
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                b.vx *= this.FRICTION;
                b.vy *= this.FRICTION;

                if (Math.abs(b.vx) < 0.1) b.vx = 0;
                if (Math.abs(b.vy) < 0.1) b.vy = 0;

                // Wall Collisions
                if (b.x - b.radius < 50) { b.x = 50 + b.radius; b.vx *= -this.WALL_BOUNCE; }
                if (b.x + b.radius > 750) { b.x = 750 - b.radius; b.vx *= -this.WALL_BOUNCE; }
                if (b.y - b.radius < 50) { b.y = 50 + b.radius; b.vy *= -this.WALL_BOUNCE; }
                if (b.y + b.radius > 750) { b.y = 750 - b.radius; b.vy *= -this.WALL_BOUNCE; }

                // Pockets
                const pockets = [[50, 50], [750, 50], [50, 750], [750, 750]];
                pockets.forEach(p => {
                    if (Math.hypot(b.x - p[0], b.y - p[1]) < this.POCKET_RADIUS) {
                        if (b === this.striker) {
                            b.vx = 0; b.vy = 0;
                            b.active = false; // Foul!
                        } else {
                            b.active = false;
                            if (window.playSound) window.playSound('pocket');
                        }
                    }
                });
            }
        });

        // Collisions (Striker-Coin, Coin-Coin)
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const b1 = entities[i];
                const b2 = entities[j];
                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist) {
                    if (window.playSound) window.playSound('strike');

                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    const vx1 = b1.vx * cos + b1.vy * sin;
                    const vy1 = b1.vy * cos - b1.vx * sin;
                    const vx2 = b2.vx * cos + b2.vy * sin;
                    const vy2 = b2.vy * cos - b2.vx * sin;

                    const m1 = b1.mass || 1;
                    const m2 = b2.mass || 1;

                    const vx1Final = ((m1 - m2) * vx1 + 2 * m2 * vx2) / (m1 + m2);
                    const vx2Final = ((m2 - m1) * vx2 + 2 * m1 * vx1) / (m1 + m2);

                    b1.vx = vx1Final * cos - vy1 * sin;
                    b1.vy = vy1 * cos + vx1Final * sin;
                    b2.vx = vx2Final * cos - vy2 * sin;
                    b2.vy = vy2 * cos + vx2Final * sin;

                    const overlap = (minDist - dist) + 1;
                    const ax = overlap * Math.cos(angle);
                    const ay = overlap * Math.sin(angle);
                    const mTotal = m1 + m2;
                    b1.x -= ax * (m2 / mTotal);
                    b1.y -= ay * (m2 / mTotal);
                    b2.x += ax * (m1 / mTotal);
                    b2.y += ay * (m1 / mTotal);
                }
            }
        }

        if (!moving && this.animating) {
            // Turn Ended (Physical motion stopped)
            this.animating = false;

            // Apply Server State if available
            if (this.pendingState) {
                this.applyState(this.pendingState);
                this.pendingState = null;
            } else {
                // Waiting for server result
                this.striker.visible = false; // Hide until update
            }
        }
    }

    resetStriker() {
        this.striker.x = 400;
        this.striker.vx = 0; this.striker.vy = 0;
        this.striker.active = true;

        // Reset to baseline based on whose turn it IS (or will be)
        // If it's my turn next, set to my baseline.
        // If it's opponent turn, set to theirs.
        // Actually, 'endTurn' changes `this.turnIndex` via server update.
        // `updateState` calls `resetStriker` again.
        // Here we just set a default safe spot?
        // Let's rely on `stateUpdate` to set correct baseline.
    }

    render() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 800, 800);

        // Board Background
        ctx.fillStyle = '#5D4037'; ctx.fillRect(0, 0, 800, 800); // Frame
        ctx.fillStyle = '#FDF5E6'; ctx.fillRect(40, 40, 720, 720); // Play surface

        // Pockets
        const pockets = [[50, 50], [750, 50], [50, 750], [750, 750]]; // Use centers
        ctx.fillStyle = '#111';
        pockets.forEach(p => {
            ctx.beginPath(); ctx.arc(p[0], p[1], 35, 0, Math.PI * 2); ctx.fill();
        });

        // Markings
        this.drawMarkings(ctx);

        // Entities
        this.coins.forEach(c => {
            if (c.active) this.drawPiece(c.x, c.y, c.radius, c.color);
        });

        if (this.striker.active) {
            this.drawPiece(this.striker.x, this.striker.y, this.striker.radius, this.striker.color);

            // Drag Line
            if (this.striker.isDragging) {
                ctx.beginPath();
                ctx.moveTo(this.striker.x, this.striker.y);
                const dx = this.dragStart.x - this.dragCurrent.x;
                const dy = this.dragStart.y - this.dragCurrent.y;
                // Cap power visual
                const dist = Math.hypot(dx, dy);
                const scale = Math.min(dist, 200);
                const angle = Math.atan2(dy, dx);

                ctx.lineTo(this.striker.x + Math.cos(angle) * scale, this.striker.y + Math.sin(angle) * scale);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }
    }

    drawMarkings(ctx) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;

        // Center Design
        ctx.beginPath(); ctx.arc(400, 400, 100, 0, Math.PI * 2); ctx.stroke(); // Main Circle
        ctx.beginPath(); ctx.arc(400, 400, 80, 0, Math.PI * 2); ctx.stroke(); // Inner pattern
        ctx.fillStyle = '#b22222'; ctx.beginPath(); ctx.arc(400, 400, 15, 0, Math.PI * 2); ctx.fill(); // Queen spot

        // Baselines
        ctx.lineWidth = 2;
        // Bottom Player
        ctx.beginPath(); ctx.moveTo(150, 635); ctx.lineTo(650, 635); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(150, 665); ctx.lineTo(650, 665); ctx.stroke();
        this.drawBaseCircle(ctx, 150, 650); this.drawBaseCircle(ctx, 650, 650);

        // Top Player
        ctx.beginPath(); ctx.moveTo(150, 135); ctx.lineTo(650, 135); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(150, 165); ctx.lineTo(650, 165); ctx.stroke();
        this.drawBaseCircle(ctx, 150, 150); this.drawBaseCircle(ctx, 650, 150);

        // Left Player
        ctx.beginPath(); ctx.moveTo(135, 150); ctx.lineTo(135, 650); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(165, 150); ctx.lineTo(165, 650); ctx.stroke();
        this.drawBaseCircle(ctx, 150, 150); this.drawBaseCircle(ctx, 150, 650);

        // Right Player
        ctx.beginPath(); ctx.moveTo(635, 150); ctx.lineTo(635, 650); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(665, 150); ctx.lineTo(665, 650); ctx.stroke();
        this.drawBaseCircle(ctx, 650, 150); this.drawBaseCircle(ctx, 650, 650);

        // Foul Lines (Arrows)
        ctx.lineWidth = 1; ctx.strokeStyle = '#555';
        const drawFoulLine = (x, y, dx, dy) => {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
            ctx.beginPath(); ctx.arc(x + dx, y + dy, 15, 0, Math.PI * 2); ctx.stroke();
        };
        // TopLeft
        drawFoulLine(70, 70, 180, 180);
        // TopRight
        drawFoulLine(730, 70, -180, 180);
        // BotLeft
        drawFoulLine(70, 730, 180, -180);
        // BotRight
        drawFoulLine(730, 730, -180, -180);
    }

    drawBaseCircle(ctx, x, y) {
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#8b0000'; ctx.fill();
        ctx.strokeStyle = '#000'; ctx.stroke();
    }

    drawPiece(x, y, r, color) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(x - r / 3, y - r / 3, r / 10, x, y, r);
        if (color === 'white') { grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#ddd'); }
        else if (color === 'black') { grad.addColorStop(0, '#555'); grad.addColorStop(1, '#222'); }
        else if (color === 'red') { grad.addColorStop(0, '#ff6b6b'); grad.addColorStop(1, '#c0392b'); }
        else { grad.addColorStop(0, '#fffacd'); grad.addColorStop(1, '#ffd700'); }
        ctx.fillStyle = grad; ctx.fill();
        ctx.stroke();
    }

    updateState(data) {
        if (data.gameState) {
            if (data.coins) this.coins = data.coins;
            if (data.players) this.myIndex = data.players.indexOf(this.socket.id);
            if (data.turn !== undefined) this.turnIndex = data.turn;
            if (data.scores) this.scores = data.scores;
        }

        if (data.event === 'shotResult') {
            const finalState = { coins: data.coins, turn: data.turn, scores: data.scores };

            // If I am already animating (my shot), wait for finish.
            // If I am NOT animating:
            // 1. If it's opponent shot: start animation
            // 2. If it's my shot (lag?): apply immediately

            if (this.animating) {
                this.pendingState = finalState;
            } else {
                if (!this.isMyTurn) {
                    // Start Opponent Anim
                    const start = data.start;
                    this.striker.x = start.x;
                    this.striker.y = start.y;
                    this.striker.vx = start.vx;
                    this.striker.vy = start.vy;
                    this.striker.active = true;
                    this.animating = true;
                    this.pendingState = finalState;
                } else {
                    this.applyState(finalState);
                }
            }
        } else if (data.event === 'stateUpdate') {
            // Fallback
            this.coins = data.coins;
            this.striker = data.striker;
            this.turnIndex = data.turn;
            this.animating = false;
        }

        this.updateUI();
    }

    applyState(state) {
        this.coins = state.coins;
        this.turnIndex = state.turn;
        if (state.scores) this.scores = state.scores;
        this.updateUI();

        // Reset Striker
        this.striker.vx = 0; this.striker.vy = 0;
        this.striker.active = true;

        // Reposition for next turn
        this.isMyTurn = (this.turnIndex === this.myIndex);

        if (this.isMyTurn) {
            this.striker.y = (this.myIndex === 1) ? 140 : 660; // P1 Bottom, P2 Top
            this.striker.x = 400;
        } else {
            // Opponent baseline visual
            // If turnIndex is 0 (P1), y=660. If 1 (P2), y=140.
            const oppY = (this.turnIndex === 1) ? 140 : 660;
            this.striker.y = oppY;
            this.striker.x = 400;
        }
    }

    updateUI() {
        this.isMyTurn = (this.turnIndex === this.myIndex);
        const turnIndicator = document.getElementById('turn-indicator');
        if (turnIndicator) turnIndicator.innerText = this.isMyTurn ? "Your Turn" : "Opponent's Turn";
    }
}

window.CarromClient = CarromClient;
