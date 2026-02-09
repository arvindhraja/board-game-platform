const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initializeLobby } = require('./lobby');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize lobby and socket handling
initializeLobby(io);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
