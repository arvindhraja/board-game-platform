const Chess = require('./games/chess');
const FourPlayerChess = require('./games/fourPlayerChess');
const Carrom = require('./games/carrom');

class GameManager {
    constructor(io, roomId, gameType, timeControl) {
        this.io = io;
        this.roomId = roomId;
        this.gameType = gameType;
        this.timeControl = timeControl; // in minutes
        this.game = null;
        this.players = [];
        this.timerInterval = null;

        // Initialize game instance based on type
        switch (gameType) {
            case 'chess':
                this.game = new Chess(timeControl);
                break;
            case 'four-chess':
                this.game = new FourPlayerChess(timeControl);
                break;
            case 'carrom':
                this.game = new Carrom(); // Timers less critical, maybe turn limit?
                break;
            default:
                console.error('Unknown game type:', gameType);
        }

        if (this.timeControl > 0 && gameType !== 'carrom') {
            this.startTimerLoop();
        }
    }

    startTimerLoop() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.game && this.game.onTimerTick) {
                const result = this.game.onTimerTick();
                if (result) {
                    this.io.to(this.roomId).emit('gameUpdate', result);
                    if (result.gameOver) {
                        clearInterval(this.timerInterval);
                    }
                }
            }
        }, 1000);
    }

    handleAction(playerId, action, data) {
        if (!this.game) {
            console.error('Game not initialized');
            return;
        }

        try {
            const result = this.game.processAction(playerId, action, data);
            if (result) {
                // Broadcast update to all players in the room
                this.io.to(this.roomId).emit('gameUpdate', result);
            }
        } catch (error) {
            console.error('Error handling action:', error);
            this.io.to(playerId).emit('error', { message: error.message });
        }
    }

    addPlayer(playerId) {
        this.players.push(playerId);

        // Assign player to a slot/color if applicable
        if (this.game && this.game.assignPlayer) {
            this.game.assignPlayer(playerId, this.players.length);
        }
    }
}

module.exports = GameManager;
