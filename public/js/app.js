const socket = io();

// UI Elements
const lobbySection = document.getElementById('lobby');
const gameRoomSection = document.getElementById('game-room');
const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
const roomIdDisplay = document.getElementById('room-id-display');
const playersList = document.getElementById('players-ul');
const chatMsgs = document.getElementById('chat-messages');
const msgInput = document.getElementById('msg-input');
const sendMsgBtn = document.getElementById('send-msg-btn');
const themeToggle = document.getElementById('theme-toggle');

// Game Instances
let currentGame = null;

// Helper to show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
}

// Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
});

// Check local storage for theme
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
}

// Lobby Actions
createBtn.addEventListener('click', () => {
    const gameType = document.getElementById('game-type').value;
    socket.emit('createRoom', { gameType });
});

joinBtn.addEventListener('click', () => {
    const roomId = document.getElementById('room-code-input').value.trim();
    if (roomId) {
        socket.emit('joinRoom', { roomId });
    } else {
        alert('Please enter a room code.');
    }
});

leaveBtn.addEventListener('click', () => {
    location.reload(); // Simple way to leave and reset state
});

// Socket Events
socket.on('roomCreated', ({ roomId, gameType }) => {
    enterRoom(roomId, gameType);
});

socket.on('roomJoined', ({ roomId, gameType }) => {
    enterRoom(roomId, gameType);
});

socket.on('playerJoined', ({ playerId, count }) => {
    addSystemMessage(`Player ${playerId.substr(0, 4)} joined. Total: ${count}`);
    updatePlayerList(count);
});

socket.on('playerLeft', ({ playerId, count }) => {
    addSystemMessage(`Player ${playerId.substr(0, 4)} left. Total: ${count}`);
    updatePlayerList(count);
});

socket.on('error', ({ message }) => {
    alert(message);
});

socket.on('receiveMessage', ({ sender, message }) => {
    addChatMessage(sender, message);
});

socket.on('gameUpdate', (data) => {
    if (currentGame) {
        currentGame.updateState(data);
    }
});

// Chat Logic
sendMsgBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const text = msgInput.value.trim();
    if (text && currentGame && currentGame.roomId) {
        socket.emit('sendMessage', { roomId: currentGame.roomId, message: text });
        msgInput.value = '';
    }
}

function addSystemMessage(text) {
    const div = document.createElement('div');
    div.classList.add('sys-msg');
    div.innerText = `[System] ${text}`;
    div.style.color = '#888';
    div.style.fontSize = '0.8rem';
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

function addChatMessage(sender, text) {
    const div = document.createElement('div');
    div.classList.add('chat-msg');
    div.innerHTML = `<strong>${sender.substr(0, 4)}:</strong> ${text}`;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

function updatePlayerList(count) {
    playersList.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const li = document.createElement('li');
        li.innerText = `Player ${i + 1}`;
        playersList.appendChild(li);
    }
}

function enterRoom(roomId, gameType) {
    showSection('game-room');
    roomIdDisplay.innerText = `Room: ${roomId} (${gameType})`;

    // Instantiate Game Client
    if (gameType === 'chess') {
        currentGame = new StandardChessClient(socket, roomId);
    } else if (gameType === 'four-chess') {
        currentGame = new FourPlayerChessClient(socket, roomId);
    } else if (gameType === 'carrom') {
        currentGame = new CarromClient(socket, roomId);
    }

    if (currentGame) {
        currentGame.init();
    }
}
