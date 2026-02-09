class CarromGame {
    constructor() {
        this.boardSize = 800;
        this.pocketRadius = 25;
        this.coinRadius = 12;
        this.strikerRadius = 18;
        this.coins = this.setupCoins();
        this.striker = { x: 400, y: 140, vx: 0, vy: 0, visible: true }; // Baseline setup
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'waiting'; // waiting, active, finished
        this.scores = { 0: 0, 1: 0, 2: 0, 3: 0 }; // Scores for p1, p2, p3, p4
        this.queenPocketed = false;
        this.coverPending = false;
    }

    setupCoins() {
        // Initial formation: Hexagon + center
        const cx = 400, cy = 400;
        const coins = [];

        // Queen
        coins.push({ id: 'queen', x: cx, y: cy, color: 'red', vx: 0, vy: 0, active: true });

        // Inner circle (6 coins)
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            coins.push({
                id: `inner-${i}`,
                x: cx + Math.cos(angle) * 26,
                y: cy + Math.sin(angle) * 26,
                color: i % 2 === 0 ? 'white' : 'black',
                vx: 0, vy: 0, active: true
            });
        }

        // Outer circle (12 coins)
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) * Math.PI / 180;
            coins.push({
                id: `outer-${i}`,
                x: cx + Math.cos(angle) * 50,
                y: cy + Math.sin(angle) * 50,
                color: 'white', // simplified distribution
                vx: 0, vy: 0, active: true
            });
        }
        return coins;
    }

    assignPlayer(playerId, index) {
        // Logic handled in GameManager, just mapping here if needed
        if (this.players.length < 4) {
            this.players.push(playerId);
        }
        if (this.players.length >= 2) this.gameState = 'active';
        return this.players.length - 1; // Return player index (0-3)
    }

    processAction(playerId, action, data) {
        if (action === 'getState') {
            return {
                coins: this.coins,
                striker: this.striker,
                scores: this.scores,
                turn: this.currentPlayerIndex,
                gameOver: this.isGameOver()
            };
        }

        const pIndex = this.players.indexOf(playerId);

        // Allow single player testing if room only has 1 player
        const isTesting = (this.gameState === 'waiting' && this.players.length === 1);

        if (!isTesting && this.gameState !== 'active') return null;
        if (!isTesting && pIndex !== this.currentPlayerIndex) return null; // Not your turn

        if (action === 'strike') {
            const { angle, power, positionX } = data;

            // simple validation of positionX (on player's baseline)

            // Apply velocity to striker
            this.striker.x = positionX;
            this.striker.y = this.getBaselineY(pIndex);
            this.striker.vx = Math.cos(angle) * power;
            this.striker.vy = Math.sin(angle) * power;

            // Run physics simulation step-by-step until everything stops
            const events = this.simulatePhysics();

            // Check game rules (pockets, fouls) based on events
            const turnResult = this.handleTurnRules(events, pIndex);

            this.updateTurn(turnResult);

            return {
                coins: this.coins,
                striker: this.striker,
                scores: this.scores,
                turn: this.currentPlayerIndex,
                events: events,    // To play sounds/animations client-side
                gameOver: this.isGameOver()
            };
        }
        return null;
    }

    getBaselineY(pIndex) {
        // 2-player: 0 (bottom), 1 (top)
        // 4-player: 0 (bottom), 1 (right), 2 (top), 3 (left)
        // Simplified: always return same baseline ref for now, assume board rotates for client
        return 140;
    }

    simulatePhysics() {
        // Discrete time steps
        const steps = [];
        let moving = true;
        let iterations = 0;
        const maxIterations = 1000; // Limit to prevent infinite loops

        while (moving && iterations < maxIterations) {
            moving = false;
            iterations++;

            // Move striker
            if (this.striker.active) {
                this.striker.x += this.striker.vx;
                this.striker.y += this.striker.vy;
                this.striker.vx *= 0.98; // Friction
                this.striker.vy *= 0.98;

                if (Math.abs(this.striker.vx) > 0.1 || Math.abs(this.striker.vy) > 0.1) moving = true;
                else { this.striker.vx = 0; this.striker.vy = 0; }

                this.checkWallCollisions(this.striker, this.strikerRadius);
            }

            // Move coins
            this.coins.forEach(coin => {
                if (!coin.active) return;
                coin.x += coin.vx;
                coin.y += coin.vy;
                coin.vx *= 0.97; // More friction for coins
                coin.vy *= 0.97;

                if (Math.abs(coin.vx) > 0.05 || Math.abs(coin.vy) > 0.05) moving = true;
                else { coin.vx = 0; coin.vy = 0; }

                this.checkWallCollisions(coin, this.coinRadius);
            });

            // Check Collisions (Striker-Coin, Coin-Coin)
            // Simplified elastic collision logic

            // Check Pockets
            this.checkPockets();
        }
        return []; // Return events if needed
    }

    checkWallCollisions(obj, radius) {
        if (obj.x - radius < 0) { obj.x = radius; obj.vx *= -1; }
        if (obj.x + radius > 800) { obj.x = 800 - radius; obj.vx *= -1; }
        if (obj.y - radius < 0) { obj.y = radius; obj.vy *= -1; }
        if (obj.y + radius > 800) { obj.y = 800 - radius; obj.vy *= -1; }
    }

    checkPockets() {
        const pockets = [[0, 0], [800, 0], [0, 800], [800, 800]];
        this.coins.forEach(coin => {
            if (!coin.active) return;
            pockets.forEach(p => {
                const dist = Math.hypot(coin.x - p[0], coin.y - p[1]);
                if (dist < 30) { // Near pocket
                    coin.active = false; // Pocketed
                    // record event
                }
            });
        });
        // Striker pocket check (foul)
    }

    handleTurnRules(events, pIndex) {
        // If pocketed own color -> continue turn
        // If pocketed opponent -> turn ends, maybe penalty?
        // If pocketed striker -> foul, lose turn, return coin?
        // For now: simple turn switch
        return { switchTurn: true };
    }

    updateTurn(result) {
        if (result.switchTurn) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        }
    }

    isGameOver() {
        // Check if all coins of one color are gone + queen
        return false;
    }
}

module.exports = CarromGame;
