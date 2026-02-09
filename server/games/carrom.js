class CarromGame {
    constructor() {
        this.boardSize = 800;
        this.coins = this.setupCoins();
        this.striker = { x: 400, y: 140, vx: 0, vy: 0, visible: true };
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'waiting';
        this.scores = { 0: 0, 1: 0, 2: 0, 3: 0 };
    }

    setupCoins() {
        const cx = 400, cy = 400;
        const coins = [];
        coins.push({ id: 'queen', x: cx, y: cy, color: 'red', vx: 0, vy: 0, active: true });
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
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) * Math.PI / 180;
            coins.push({
                id: `outer-${i}`,
                x: cx + Math.cos(angle) * 50,
                y: cy + Math.sin(angle) * 50,
                color: 'white',
                vx: 0, vy: 0, active: true
            });
        }
        return coins;
    }

    assignPlayer(playerId, index) {
        if (this.players.length < 4) {
            this.players.push(playerId);
        }
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
        const isTesting = (this.gameState === 'waiting' && this.players.length === 1); // Allow single player testing

        if (!isTesting && this.gameState !== 'active') return null;
        if (!isTesting && pIndex !== this.currentPlayerIndex) return null;

        if (action === 'shoot') {
            const { angle, power, positionX } = data;
            // Update server state for striker start
            this.striker.x = positionX;

            // Broadcast 'shoot' event for other clients to animate
            return {
                event: 'shoot',
                angle, power, positionX,
                pIndex: pIndex
            };
        }

        if (action === 'endTurn') {
            // Client sends final state
            if (data.coins) this.coins = data.coins;
            if (data.striker) this.striker = data.striker;

            // Switch turn logic (simplified)
            // Ideally, we check rules: did they pocket their piece?
            // For now, trust the client's decision on switchTurn
            if (data.switchTurn) {
                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % Math.max(1, this.players.length);
            }

            return {
                event: 'stateUpdate',
                coins: this.coins,
                striker: this.striker,
                turn: this.currentPlayerIndex
            };
        }

        return null;
    }
}

module.exports = CarromGame;
