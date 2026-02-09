class CarromClient {
    constructor(socket, roomId) {
        this.socket = socket;
        this.roomId = roomId;
        this.boardEl = document.getElementById('game-board-area');
        this.canvas = null;
        this.ctx = null;

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

        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        this.power = 0;
        this.angle = 0;

        this.isMyTurn = true; // For local/testing
        this.animating = false;
    }

    init() {
        this.boardEl.innerHTML = `
            <div style="position: relative; width: 100%; max-width: 600px; margin: 0 auto;">
                <canvas id="carrom-board" width="800" height="800" style="width: 100%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); background: #fdf5e6;"></canvas>
                <div id="game-ui" style="position: absolute; top: 10px; left: 10px; pointer-events: none;">
                    <div style="background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 4px;">P1 Score: <span id="p1-score">0</span></div>
                </div>
            </div>
        `;
        this.canvas = document.getElementById('carrom-board');
        this.ctx = this.canvas.getContext('2d');

        // Initial Board Setup
        this.setupBoard();
        this.setupInput();

        // Animation Loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));

        console.log('High-Polish Carrom Initialized');
    }

    setupBoard() {
        // Arrange coins in center
        this.coins = [];
        const center = this.BOARD_SIZE / 2;

        // Queen
        this.coins.push({ x: center, y: center, color: 'red', radius: this.COIN_RADIUS, mass: 1, vx: 0, vy: 0, active: true });

        // Inner Circle (6 coins)
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const dist = this.COIN_RADIUS * 2.1;
            this.coins.push({
                x: center + Math.cos(angle) * dist,
                y: center + Math.sin(angle) * dist,
                color: i % 2 === 0 ? 'white' : 'black',
                radius: this.COIN_RADIUS, mass: 1, vx: 0, vy: 0, active: true
            });
        }

        // Outer Circle (12 coins)
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) * Math.PI / 180;
            const dist = this.COIN_RADIUS * 4.1;
            // Pattern: W,W,B,W,W,B... simplified for now
            this.coins.push({
                x: center + Math.cos(angle) * dist,
                y: center + Math.sin(angle) * dist,
                color: (i % 3 !== 2) ? 'white' : 'black', // Just a pattern
                radius: this.COIN_RADIUS, mass: 1, vx: 0, vy: 0, active: true
            });
        }

        // Reset Striker
        this.resetStriker();
    }

    resetStriker() {
        this.striker.x = this.BOARD_SIZE / 2;
        this.striker.y = 660; // Baseline
        this.striker.vx = 0;
        this.striker.vy = 0;
        this.striker.active = true;
    }

    setupInput() {
        // Mapping mouse/touch coords to canvas
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

        this.canvas.addEventListener('mousedown', (e) => this.handleDragStart(getPos(e)));
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleDragStart(getPos(e)); }, { passive: false });

        window.addEventListener('mousemove', (e) => this.handleDragMove(getPos(e)));
        window.addEventListener('touchmove', (e) => { this.handleDragMove(getPos(e)); }, { passive: false });

        window.addEventListener('mouseup', () => this.handleDragEnd());
        window.addEventListener('touchend', () => this.handleDragEnd());
    }

    handleDragStart(pos) {
        if (!this.striker.active || this.animating) return;

        // Check if touching striker (allow slightly larger area)
        const dx = pos.x - this.striker.x;
        const dy = pos.y - this.striker.y;
        if (Math.hypot(dx, dy) < this.striker.radius * 2) {
            this.striker.isDragging = true;
            this.dragStart = pos;
            this.dragCurrent = pos;
        } else {
            // Allow moving striker left/right on baseline
            if (pos.y > 620 && pos.y < 700) {
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

            // Calculate Vector
            const dx = this.dragStart.x - this.dragCurrent.x;
            const dy = this.dragStart.y - this.dragCurrent.y;

            const dist = Math.hypot(dx, dy);
            if (dist > 10) {
                const maxPower = 40;
                const power = Math.min(dist * 0.15, maxPower);
                const angle = Math.atan2(dy, dx);

                this.striker.vx = Math.cos(angle) * power;
                this.striker.vy = Math.sin(angle) * power;

                if (window.playSound) window.playSound('strike');
                this.animating = true;
            }
        }
    }

    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        // Cap dt to prevent huge jumps (e.g. tab switching)
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
            if (Math.abs(b.vx) > 0.1 || Math.abs(b.vy) > 0.1) {
                moving = true;

                // Movement
                b.x += b.vx * dt;
                b.y += b.vy * dt;

                // Friction
                b.vx *= this.FRICTION;
                b.vy *= this.FRICTION; // Simple friction

                if (Math.abs(b.vx) < 0.1) b.vx = 0;
                if (Math.abs(b.vy) < 0.1) b.vy = 0;

                // Wall Collisions
                if (b.x - b.radius < 50) { b.x = 50 + b.radius; b.vx *= -this.WALL_BOUNCE; }
                if (b.x + b.radius > 750) { b.x = 750 - b.radius; b.vx *= -this.WALL_BOUNCE; }
                if (b.y - b.radius < 50) { b.y = 50 + b.radius; b.vy *= -this.WALL_BOUNCE; }
                if (b.y + b.radius > 750) { b.y = 750 - b.radius; b.vy *= -this.WALL_BOUNCE; }

                // Pocket detection
                const pockets = [[50, 50], [750, 50], [50, 750], [750, 750]];
                pockets.forEach(p => {
                    if (Math.hypot(b.x - p[0], b.y - p[1]) < this.POCKET_RADIUS) {
                        // Pocketed!
                        if (b === this.striker) {
                            // Foul! Reset striker
                            this.striker.vx = 0; this.striker.vy = 0;
                            this.resetStriker();
                        } else {
                            b.active = false;
                            if (window.playSound) window.playSound('pocket');
                        }
                    }
                });
            }
        });

        // Circle-Circle Collision
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const b1 = entities[i];
                const b2 = entities[j];

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist) {
                    // Collision response
                    if (window.playSound) window.playSound('strike'); // Soft tick?

                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    // Rotate velocity
                    const vx1 = b1.vx * cos + b1.vy * sin;
                    const vy1 = b1.vy * cos - b1.vx * sin;
                    const vx2 = b2.vx * cos + b2.vy * sin;
                    const vy2 = b2.vy * cos - b2.vx * sin;

                    // Elastic collision with Mass
                    // v1' = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2)
                    const m1 = b1.mass || 1;
                    const m2 = b2.mass || 1;

                    const vx1Final = ((m1 - m2) * vx1 + 2 * m2 * vx2) / (m1 + m2);
                    const vx2Final = ((m2 - m1) * vx2 + 2 * m1 * vx1) / (m1 + m2);

                    // Update velocities
                    // Rotate back: x = vx * cos - vy * sin, y = vy * cos + vx * sin
                    b1.vx = vx1Final * cos - vy1 * sin;
                    b1.vy = vy1 * cos + vx1Final * sin;
                    b2.vx = vx2Final * cos - vy2 * sin;
                    b2.vy = vy2 * cos + vx2Final * sin;

                    // Separation to prevent sticking
                    const overlap = (minDist - dist) + 1; // +1 extra push
                    const ax = overlap * Math.cos(angle);
                    const ay = overlap * Math.sin(angle);

                    // Distribute separation based on inverse mass (heavier moves less)
                    const mTotal = m1 + m2;
                    b1.x -= ax * (m2 / mTotal);
                    b1.y -= ay * (m2 / mTotal);
                    b2.x += ax * (m1 / mTotal);
                    b2.y += ay * (m1 / mTotal);
                }
            }
        }

        if (!moving && this.striker.vx === 0 && this.striker.vy === 0) {
            this.animating = false;
            // Next turn logic could go here
            this.resetStriker();
        }
    }

    render() {
        if (!this.ctx) return;
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, 800, 800);

        // Draw Woods
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, 800, 800);
        ctx.fillStyle = '#F5DEB3'; // Playing area
        ctx.fillRect(50, 50, 700, 700);

        // Board Design (Center Design)
        ctx.beginPath();
        ctx.strokeStyle = '#D2691E';
        ctx.lineWidth = 2;
        ctx.arc(400, 400, 100, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        // Baseline lines
        const drawBaseline = (y) => {
            ctx.beginPath();
            ctx.moveTo(100, y);
            ctx.lineTo(700, y);
            ctx.stroke();
            // End circles needed?
        };
        drawBaseline(140);
        drawBaseline(660);

        // Pockets
        const pockets = [[50, 50], [750, 50], [50, 750], [750, 750]];
        pockets.forEach(p => {
            ctx.beginPath();
            ctx.arc(p[0], p[1], 35, 0, Math.PI * 2);
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
            ctx.strokeStyle = '#5c4033';
            ctx.lineWidth = 5;
            ctx.stroke();
        });

        // Shadows
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Render Coins
        this.coins.forEach(c => {
            if (c.active) this.drawPiece(c.x, c.y, c.radius, c.color);
        });

        // Render Striker
        if (this.striker.active) {
            this.drawPiece(this.striker.x, this.striker.y, this.striker.radius, this.striker.color);

            // Aim Line
            if (this.striker.isDragging) {
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(this.striker.x, this.striker.y);
                const dx = this.dragStart.x - this.dragCurrent.x;
                const dy = this.dragStart.y - this.dragCurrent.y;
                const dist = Math.hypot(dx, dy);
                const maxLen = 200;
                const scale = Math.min(dist, maxLen) / dist; // Limit visual length

                ctx.lineTo(this.striker.x + dx * scale, this.striker.y + dy * scale);
                ctx.strokeStyle = `rgba(255, 0, 0, ${Math.min(dist / 100, 1)})`;
                ctx.lineWidth = 4;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        ctx.shadowBlur = 0; // Reset
    }

    drawPiece(x, y, r, color) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        // Gradient fill
        const grad = ctx.createRadialGradient(x - r / 3, y - r / 3, r / 10, x, y, r);
        if (color === 'white') {
            grad.addColorStop(0, '#fff');
            grad.addColorStop(1, '#e0e0e0');
        } else if (color === 'black') {
            grad.addColorStop(0, '#555');
            grad.addColorStop(1, '#222');
        } else if (color === 'red') {
            grad.addColorStop(0, '#ff6b6b');
            grad.addColorStop(1, '#c0392b');
        } else {
            // Gold/Striker
            grad.addColorStop(0, '#fffacd');
            grad.addColorStop(1, '#ffd700');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    updateState(data) {
        // Optional: socket sync if needed later
    }
}

window.CarromClient = CarromClient;
