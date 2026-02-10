const { v4: uuidv4 } = require('uuid');
const GameManager = require('./gameManager');

const rooms = {}; // Map of roomId -> room object

function initializeLobby(io) {
    io.on('connection', (socket) => {
        const userId = socket.user ? socket.user._id : null;
        const username = socket.user ? socket.user.username : `Guest-${socket.id.substr(0, 4)}`;

        console.log(`User connected: ${username} (${socket.id})`);

        socket.on('createRoom', ({ gameType, timeControl, mode }) => {
            const roomId = uuidv4().slice(0, 8);
            const gameMode = mode || 'human';

            const gameManager = new GameManager(io, roomId, gameType, timeControl, gameMode);

            rooms[roomId] = {
                id: roomId,
                gameType,
                timeControl,
                gameManager,
                createdAt: Date.now()
            };

            socket.join(roomId);
            gameManager.addPlayer(socket.id, userId);

            socket.emit('roomCreated', { roomId, gameType, timeControl });
            // Notify self
            socket.emit('playerJoined', { playerId: socket.id, username, count: 1 });

            console.log(`Room ${roomId} created by ${username}`);
        });

        socket.on('joinRoom', ({ roomId }) => {
            const room = rooms[roomId];
            if (!room) {
                socket.emit('error', { message: 'Room not found.' });
                return;
            }

            // Check if player is already in?
            if (room.gameManager.players.includes(socket.id)) {
                return;
            }

            // Determine max players based on game type
            let maxPlayers = 2;
            if (room.gameType === 'four-chess') maxPlayers = 4;

            const currentCount = room.gameManager.players.length;

            socket.join(roomId);

            if (currentCount < maxPlayers) {
                // Add as Player
                room.gameManager.addPlayer(socket.id, userId);
                io.to(roomId).emit('playerJoined', { playerId: socket.id, username, count: currentCount + 1 });
                socket.emit('roomJoined', { roomId, gameType: room.gameType, timeControl: room.timeControl, role: 'player' });

                // Check for Game Start condition
                // Logic usually handled by clients clicking "Start" or auto-start
                // For now, let's auto-start if full? 
                // Chess starts when 2 players are there usually?
                // Or wait for first move?
                // Current GameManager relies on 'processAction' to start timer/active state.
            } else {
                // Add as Spectator
                socket.emit('roomJoined', { roomId, gameType: room.gameType, timeControl: room.timeControl, role: 'spectator' });
                // Send current state
                if (room.gameManager.game) {
                    const state = room.gameManager.game.getState ? room.gameManager.game.getState() : null;
                    if (state) socket.emit('gameUpdate', state);
                }
            }

            console.log(`${username} joined room ${roomId}`);
        });

        socket.on('gameAction', ({ roomId, action, data }) => {
            const room = rooms[roomId];
            if (room && room.gameManager) {
                room.gameManager.handleAction(socket.id, action, data);
            }
        });

        socket.on('sendMessage', ({ roomId, message }) => {
            // Broadcast with sender name
            io.to(roomId).emit('receiveMessage', { sender: username, message });
        });

        socket.on('disconnect', () => {
            // Improve Cleanup
            // If player was in a room, handle it.
            // Loop is inefficient but simple for now.
            for (const roomId in rooms) {
                const room = rooms[roomId];
                if (room.gameManager.players.includes(socket.id)) {
                    // Start timer for reconnection? 
                    // For now, just mark as disconnected or end game?
                    // Let's just notify.
                    io.to(roomId).emit('playerLeft', { playerId: socket.id, username });

                    // Cleanup empty rooms
                    // Note: Socket.io leaves rooms automatically on disconnect
                }
            }
        });
    });
}

module.exports = { initializeLobby };
