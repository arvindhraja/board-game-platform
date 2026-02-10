const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { initializeLobby } = require('./lobby');
const connectDB = require('./config/db');

dotenv.config();

// Connect to Database
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/match'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const jwt = require('jsonwebtoken');
const User = require('./models/User');

io.use(async (socket, next) => {
  if (socket.handshake.auth && socket.handshake.auth.token) {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        socket.user = user;
      }
      next();
    } catch (err) {
      console.log("Socket Auth Failed, continuing as guest:", err.message);
      next();
    }
  } else {
    next();
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
