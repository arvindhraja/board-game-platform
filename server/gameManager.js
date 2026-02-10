const Chess = require('./games/chess');
const FourPlayerChess = require('./games/fourPlayerChess');
const Carrom = require('./games/carrom');
const User = require('./models/User');
const Match = require('./models/Match');
const ChessAI = require('./ai/chessEngine');
const CarromAI = require('./ai/carromEngine');

class GameManager {
    constructor(io, roomId, gameType, timeControl, mode = 'human') {
        this.io = io;
        this.roomId = roomId;
        this.gameType = gameType;
        this.timeControl = timeControl; // in minutes
        this.game = null;
        this.players = [];
        this.playerMap = {}; // socketId -> userId (if logged in)
        this.timerInterval = null;
        this.startTime = Date.now();
        this.mode = mode;
        this.ai = null;

        // Check for AI mode (suffix override)
        if (gameType.endsWith('-ai')) {
            this.mode = 'ai';
            this.realGameType = gameType.replace('-ai', '');
        } else {
            this.realGameType = gameType;
        }

        // Initialize game instance
        switch (this.realGameType) {
            case 'chess':
                this.game = new Chess(timeControl);
                if (this.mode === 'ai') this.ai = new ChessAI(5); // Default difficulty
                break;
            case 'four-chess':
                this.game = new FourPlayerChess(timeControl);
                // AI logic handled in playAITurn directly for now
                break;
            case 'carrom':
                this.game = new Carrom();
                if (this.mode === 'ai') this.ai = new CarromAI(5);
                break;
            default:
                console.error('Unknown game type:', gameType);
        }

        // Handle AI Logic later

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
                        this.endGame(result);
                        clearInterval(this.timerInterval);
                    }
                }
            }
        }, 1000);
    }

    async handleAction(playerId, action, data) {
        if (!this.game) return;

        try {
            const result = this.game.processAction(playerId, action, data);
            if (result) {
                this.io.to(this.roomId).emit('gameUpdate', result);

                // Check if AI Turn
                if (this.mode === 'ai' && !result.gameOver) {
                    if (this.realGameType === 'chess' && result.turn !== 'w') { // AI is Black (standard)
                        setTimeout(() => this.playAITurn(), 100);
                    } else if (this.realGameType === 'carrom' && result.turn === 1) { // AI is Player 2
                        setTimeout(() => this.playAITurn(), 1500);
                    }
                }

                if (result.gameOver) {
                    this.endGame(result);
                    if (this.timerInterval) clearInterval(this.timerInterval);
                }
            }
        } catch (error) {
            console.error('Error handling action:', error);
            this.io.to(playerId).emit('error', { message: error.message });
        }
    }

    addPlayer(playerId, userId = null) {
        this.players.push(playerId);
        if (userId) this.playerMap[playerId] = userId;

        if (this.game && this.game.assignPlayer) {
            this.game.assignPlayer(playerId, this.players.length);
        }

        // Auto Add AI Bots if mode is AI
        if (this.mode === 'ai') {
            let target = 2;
            if (this.realGameType === 'four-chess') target = 4;

            while (this.players.length < target) {
                const aiId = 'AI_BOT_' + (this.players.length);
                this.players.push(aiId);
                this.playerMap[aiId] = 'AI_BOT';

                if (this.game && this.game.assignPlayer) {
                    this.game.assignPlayer(aiId, this.players.length);
                }
                console.log(`Bot ${aiId} added to Room ${this.roomId}`);
            }
        }
    }

    async playAITurn() {
        if (!this.game) return;
        if (!this.ai && this.realGameType !== 'four-chess') return;

        try {
            if (this.realGameType === 'chess') {
                const state = this.game.getState();
                const fen = state.fen;
                const turn = state.turn;

                let currentPlayerId;
                if (turn === 'w') currentPlayerId = this.game.players.white;
                else currentPlayerId = this.game.players.black;

                if (!currentPlayerId || !currentPlayerId.startsWith('AI_BOT')) return;

                let move = await this.ai.getBestMove(fen);

                if (!move) {
                    console.log("Stockfish silent, using random move.");
                    const moves = this.game.chess.moves({ verbose: true });
                    if (moves.length > 0) {
                        move = moves[Math.floor(Math.random() * moves.length)];
                    }
                }

                if (move) {
                    const result = this.game.processAction(currentPlayerId, 'move', move);
                    if (result) {
                        this.io.to(this.roomId).emit('gameUpdate', result);
                        if (result.gameOver) this.endGame(result);
                    }
                }
            } else if (this.realGameType === 'carrom') {
                const aiIndex = this.players.findIndex(p => p.startsWith('AI_BOT'));
                if (this.game.currentPlayerIndex !== aiIndex || aiIndex === -1) return;

                const state = this.game.getState();
                const shot = this.ai.calculateShot(state.coins, state.striker);

                if (shot) {
                    const botId = this.players[aiIndex];
                    const result = this.game.processAction(botId, 'shoot', shot);
                    if (result) {
                        this.io.to(this.roomId).emit('gameUpdate', result);
                    }
                }
            } else if (this.realGameType === 'four-chess') {
                const state = this.game.getState();
                const turnColor = state.turn;
                const currentPlayerId = state.players[turnColor];

                if (!currentPlayerId || !currentPlayerId.startsWith('AI_BOT')) return;

                await new Promise(r => setTimeout(r, 1000));

                const moves = this.game.generateMoves(turnColor);
                if (moves.length > 0) {
                    const candidates = moves.slice(0, 3);
                    const move = candidates[Math.floor(Math.random() * candidates.length)];

                    const result = this.game.processAction(currentPlayerId, 'move', move);
                    if (result) {
                        this.io.to(this.roomId).emit('gameUpdate', result);
                        if (result.gameOver) this.endGame(result);
                    }
                }
            }
        } catch (e) {
            console.error("AI Turn Error:", e);
        }
    }

    async endGame(result) {
        console.log(`Game Over in room ${this.roomId}. Winner: ${result.winner}`);

        // Prepare Match Data
        const playerIds = Object.values(this.playerMap);
        if (playerIds.length < 2) return; // Don't record single player or guest games for now?
        // Actually record if at least one registered user?
        // Let's iterate all registered users involved.

        try {
            // Determine Winner User ID
            // result.winner is usually 'w', 'b', or index.
            // We need to map 'w' -> playerId -> userId.

            // This mapping logic depends on Game implementation of 'players' object
            // Chess: { white: socketId, black: socketId }
            // Carrom: players array [socketId, socketId...]

            let winnerId = null;
            const gamePlayers = this.game.players;

            // Resolve Winner ID
            if (this.realGameType === 'chess') {
                const winnerColor = result.winner; // 'w' or 'b'
                if (winnerColor === 'w') winnerId = gamePlayers.white === 'AI_BOT' ? 'AI_BOT' : this.playerMap[gamePlayers.white];
                else if (winnerColor === 'b') winnerId = gamePlayers.black === 'AI_BOT' ? 'AI_BOT' : this.playerMap[gamePlayers.black];
            }

            // Handle AI and Spectators in playerIds
            const validPlayerIds = playerIds.filter(id => id && id !== 'AI_BOT');

            // Retrieve Moves
            let moves = [];
            if (this.game && this.game.getHistory) {
                moves = this.game.getHistory().map(m => ({
                    action: m.san,
                    timestamp: Date.now() // placeholder
                }));
            }

            // Save Match
            const match = await Match.create({
                gameType: this.realGameType,
                players: validPlayerIds,
                result: {
                    winner: (winnerId && winnerId !== 'AI_BOT') ? winnerId : null,
                    reason: result.reason,
                    score: result.score
                },
                moves: moves,
                startedAt: this.startTime,
                endedAt: Date.now()
            });

            // Update Users
            for (const socketId of this.players) {
                const userId = this.playerMap[socketId];
                if (!userId) continue;

                const user = await User.findById(userId);
                if (user) {
                    // Update History
                    const isWin = userId === winnerId;
                    user.history.push({
                        gameType: this.gameType,
                        result: isWin ? 'win' : (result.winner ? 'loss' : 'draw'),
                        opponent: 'Online Player', // simplified
                        timestamp: Date.now()
                    });

                    // Update Ratings (Elo Simplified)
                    if (winnerId) {
                        const change = isWin ? 10 : -10;
                        if (!user.ratings[this.gameType]) user.ratings[this.gameType] = 1200;
                        user.ratings[this.gameType] += change;
                    }

                    // Update Streak
                    const now = new Date();
                    const last = user.streak.lastPlayed ? new Date(user.streak.lastPlayed) : null;

                    if (last) {
                        const diffTime = Math.abs(now - last);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        // If same day, ignore. If 1 day diff (yesterday), increment. If >1, reset.
                        // Logic simplified:
                        const isSameDay = now.getDate() === last.getDate() && now.getMonth() === last.getMonth();
                        const isYesterday = (now - last) < 172800000 && !isSameDay; // Ultra simplified check

                        if (!isSameDay) {
                            if (isYesterday || diffDays <= 2) { // tolerant
                                user.streak.current += 1;
                            } else {
                                user.streak.current = 1;
                            }
                        }
                    } else {
                        user.streak.current = 1;
                    }
                    user.streak.lastPlayed = now;

                    await user.save();
                }
            }

        } catch (e) {
            console.error("Error saving game result:", e);
        }
    }
}

module.exports = GameManager;
