const { v4: uuidv4 } = require('uuid');
const GameManager = require('./gameManager');

const rooms = {}; // Map of roomId -> room object

function initializeLobby(io) {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Create a new room
        socket.on('createRoom', ({ gameType }) => {
            const roomId = uuidv4().slice(0, 8); // simple short code
            rooms[roomId] = {
                id: roomId,
                gameType: gameType,
                players: [],
                status: 'waiting', // waiting, playing, ended
                gameManager: new GameManager(roomId, gameType, io),
            };

            socket.join(roomId);
            rooms[roomId].players.push(socket.id);

            console.log(`Room created: ${roomId} with game type ${gameType}`);

            socket.emit('roomCreated', { roomId, gameType });
            io.to(roomId).emit('playerJoined', { playerId: socket.id, count: rooms[roomId].players.length });
        });

        // Join an existing room
        socket.on('joinRoom', ({ roomId }) => {
            const room = rooms[roomId];
            if (room) {
                if (room.status === 'playing' && room.players.length >= room.gameManager.maxPlayers) {
                    socket.emit('error', { message: 'Room is full or game has started.' });
                    return;
                }

                socket.join(roomId);
                room.players.push(socket.id);

                console.log(`User ${socket.id} joined room ${roomId}`);

                socket.emit('roomJoined', { roomId, gameType: room.gameType });
                io.to(roomId).emit('playerJoined', { playerId: socket.id, count: room.players.length });

                // Check if game can start
                if (room.players.length === room.gameManager.maxPlayers) { // simplified check
                    // Notify players to start game logic
                    // In a real scenario you might have a "Ready" button
                }
            } else {
                socket.emit('error', { message: 'Room not found.' });
            }
        });

        // Game actions
        socket.on('gameAction', ({ roomId, action, data }) => {
            const room = rooms[roomId];
            if (room && room.gameManager) {
                room.gameManager.handleAction(socket.id, action, data);
            }
        });

        // Chat message
        socket.on('sendMessage', ({ roomId, message }) => {
            io.to(roomId).emit('receiveMessage', { sender: socket.id, message });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            // find room user was in and remove
            for (const roomId in rooms) {
                const room = rooms[roomId];
                const index = room.players.indexOf(socket.id);
                if (index !== -1) {
                    room.players.splice(index, 1);
                    io.to(roomId).emit('playerLeft', { playerId: socket.id, count: room.players.length });

                    if (room.players.length === 0) {
                        delete rooms[roomId]; // Clean up empty rooms
                        console.log(`Room ${roomId} deleted.`);
                    }
                    break;
                }
            }
        });
    });
}

module.exports = { initializeLobby };
