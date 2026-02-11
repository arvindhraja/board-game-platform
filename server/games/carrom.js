class CarromGame {
    constructor() {
        this.boardSize = 800;
        this.coins = this.setupCoins();
        this.striker = { x: 400, y: 140, vx: 0, vy: 0, visible: true, radius: 20, mass: 2 };
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'waiting';
        this.scores = { 0: 0, 1: 0, 2: 0, 3: 0 };

        // Physics Constants
        this.FRICTION = 0.985;
        this.WALL_BOUNCE = 0.7;
        this.POCKET_RADIUS = 35;
        this.COIN_RADIUS = 14;
        this.STRIKER_RADIUS = 20;
    }

    setupCoins() {
        const cx = 400, cy = 400;
        const coins = [];
        coins.push({ id: 'queen', x: cx, y: cy, radius: 14, color: 'red', vx: 0, vy: 0, active: true, mass: 1 });

        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            coins.push({ id: `inner-${i}`, x: cx + Math.cos(angle) * 29, y: cy + Math.sin(angle) * 29, radius: 14, color: i % 2 === 0 ? 'white' : 'black', vx: 0, vy: 0, active: true, mass: 1 });
        }
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) * Math.PI / 180;
            coins.push({ id: `outer-${i}`, x: cx + Math.cos(angle) * 54, y: cy + Math.sin(angle) * 54, radius: 14, color: i % 2 === 0 ? 'white' : 'black', vx: 0, vy: 0, active: true, mass: 1 });
        }
        return coins;
    }

    assignPlayer(playerId, index) {
        if (this.players.length < 4) this.players.push(playerId);
        if (this.players.length >= 2) this.gameState = 'active';
        return this.players.length - 1;
    }

    processAction(playerId, action, data) {
        if (action === 'getState') {
            return {
                coins: this.coins,
                striker: this.striker,
                scores: this.scores,
                turn: this.currentPlayerIndex,
                gameState: this.gameState,
                players: this.players
            };
        }

        const pIndex = this.players.indexOf(playerId);
        const isAiTurn = playerId && playerId.startsWith('AI_BOT');
        const isTesting = (this.gameState === 'waiting' && this.players.length === 1);

        console.log(`Carrom: Action ${action} from ${playerId} (Index: ${pIndex}, Turn: ${this.currentPlayerIndex})`);

        if (!isTesting && !isAiTurn && this.gameState !== 'active') {
            console.log(`Carrom: Ignored action (Game not active). State: ${this.gameState}`);
            return null;
        }
        if (!isTesting && pIndex !== this.currentPlayerIndex) {
            console.log(`Carrom: Ignored action (Not turn).`);
            return null;
        }

        if (action === 'shoot') {
            const { angle, power, positionX } = data;

            this.striker.x = positionX;
            // Baseline 
            if (pIndex === 0) this.striker.y = 660; // Bottom P1
            else if (pIndex === 1) this.striker.y = 140; // Top P2

            if (data.positionY) this.striker.y = data.positionY;

            this.striker.vx = Math.cos(angle) * power;
            this.striker.vy = Math.sin(angle) * power;
            this.striker.visible = true;

            // Run Server-Side Simulation
            const result = this.simulateShot();

            // Broadcast start parameters AND final state
            // Client should ideally animate active logic, but snap to final state
            return {
                event: 'shotResult',
                start: { x: positionX, y: this.striker.y, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power },
                coins: this.coins,
                striker: this.striker,
                turn: this.currentPlayerIndex,
                pocketed: result.pocketed,
                foul: result.foul,
                scores: this.scores
            };
        }

        return null;
    }

    simulateShot() {
        let moving = true;
        let ticks = 0;
        const dt = 1;

        const entities = [this.striker, ...this.coins.filter(c => c.active)];
        const pocketed = [];
        let foul = false;

        // Run simulation until everything stops or max ticks
        while (moving && ticks < 2000) {
            moving = false;
            ticks++;

            entities.forEach(b => {
                if (Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05) {
                    moving = true;
                    b.x += b.vx * dt;
                    b.y += b.vy * dt;
                    b.vx *= this.FRICTION;
                    b.vy *= this.FRICTION;

                    // Walls
                    if (b.x < 50 + b.radius) { b.x = 50 + b.radius; b.vx *= -this.WALL_BOUNCE; }
                    if (b.x > 750 - b.radius) { b.x = 750 - b.radius; b.vx *= -this.WALL_BOUNCE; }
                    if (b.y < 50 + b.radius) { b.y = 50 + b.radius; b.vy *= -this.WALL_BOUNCE; }
                    if (b.y > 750 - b.radius) { b.y = 750 - b.radius; b.vy *= -this.WALL_BOUNCE; }

                    // Pockets
                    const pockets = [[50, 50], [750, 50], [50, 750], [750, 750]];
                    pockets.forEach(p => {
                        if (Math.hypot(b.x - p[0], b.y - p[1]) < this.POCKET_RADIUS) {
                            if (b === this.striker) {
                                foul = true;
                                b.vx = 0; b.vy = 0;
                                b.x = 400; b.y = 140; // Reset logic handled later, but stop physics
                            } else {
                                b.active = false;
                                b.vx = 0; b.vy = 0;
                                b.x = -1000;
                                if (!pocketed.includes(b)) pocketed.push(b);
                            }
                        }
                    });
                }
            });

            // Collisions
            for (let i = 0; i < entities.length; i++) {
                for (let j = i + 1; j < entities.length; j++) {
                    const b1 = entities[i];
                    const b2 = entities[j];
                    if ((!b1.active && b1 !== this.striker) || (!b2.active && b2 !== this.striker)) continue;

                    const dx = b2.x - b1.x;
                    const dy = b2.y - b1.y;
                    const dist = Math.hypot(dx, dy);
                    const minDist = b1.radius + b2.radius;

                    if (dist < minDist) {
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle), cos = Math.cos(angle);

                        const vx1 = b1.vx * cos + b1.vy * sin;
                        const vy1 = b1.vy * cos - b1.vx * sin;
                        const vx2 = b2.vx * cos + b2.vy * sin;
                        const vy2 = b2.vy * cos - b2.vx * sin;

                        const m1 = b1.mass || 1, m2 = b2.mass || 1;
                        const vx1Final = ((m1 - m2) * vx1 + 2 * m2 * vx2) / (m1 + m2);
                        const vx2Final = ((m2 - m1) * vx2 + 2 * m1 * vx1) / (m1 + m2);

                        b1.vx = vx1Final * cos - vy1 * sin;
                        b1.vy = vy1 * cos + vx1Final * sin;
                        b2.vx = vx2Final * cos - vy2 * sin;
                        b2.vy = vy2 * cos + vx2Final * sin;

                        const overlap = (minDist - dist) + 1;
                        b1.x -= overlap * Math.cos(angle) * 0.5;
                        b1.y -= overlap * Math.sin(angle) * 0.5;
                        b2.x += overlap * Math.cos(angle) * 0.5;
                        b2.y += overlap * Math.sin(angle) * 0.5;
                    }
                }
            }
        }

        // Logic for turn switching
        let turnContinue = false;

        if (pocketed.length > 0) {
            turnContinue = true;
            this.scores[this.currentPlayerIndex] += pocketed.length * 10;
        }

        if (foul) {
            turnContinue = false;
            this.scores[this.currentPlayerIndex] = Math.max(0, this.scores[this.currentPlayerIndex] - 10);
            // Reset striker?
        }

        if (!turnContinue) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % Math.max(1, this.players.length);
        }

        return { pocketed, foul };
    }
}

module.exports = CarromGame;
