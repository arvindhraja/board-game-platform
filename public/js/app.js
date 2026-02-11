const socket = io({
    auth: {
        token: localStorage.getItem('token')
    }
});

// UI Elements
const authSection = document.getElementById('auth-section');
const lobbySection = document.getElementById('lobby');
const gameRoomSection = document.getElementById('game-room');

// Auth UI
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
// ... other existing

// Auth Event Listeners
document.getElementById('guest-btn').addEventListener('click', () => showSection('lobby'));
document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.add('hidden'); signupForm.classList.remove('hidden'); });
document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });

document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-username').value; // Using this input as email
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            socket.auth.token = data.token;
            socket.disconnect().connect();
            showSection('lobby');
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (e) { console.error(e); alert('Login Error'); }
});

document.getElementById('signup-btn').addEventListener('click', async () => {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
            socket.auth.token = data.token;
            socket.disconnect().connect();
            showSection('lobby');
        } else {
            alert(data.message || 'Signup failed');
        }
    } catch (e) { console.error(e); alert('Signup Error'); }
});

// Check Session
if (localStorage.getItem('token')) {
    showSection('lobby');
}

const roomIdDisplay = document.getElementById('room-id-display');
const playersList = document.getElementById('players-ul');
const chatMsgs = document.getElementById('chat-messages');
const msgInput = document.getElementById('msg-input');
const sendMsgBtn = document.getElementById('send-msg-btn');
const themeToggle = document.getElementById('theme-toggle');
const soundToggle = document.getElementById('sound-toggle');

// Game Instances
let currentGame = null;

// Sound System
window.soundEnabled = true;
window.playSound = (soundName) => {
    if (!window.soundEnabled) return;
    const audio = new Audio(`assets/sounds/${soundName}.mp3`);
    audio.play().catch(e => console.log('Audio play failed', e)); // Catch interaction errors
};

if (soundToggle) {
    soundToggle.addEventListener('click', () => {
        window.soundEnabled = !window.soundEnabled;
        soundToggle.innerText = window.soundEnabled ? '🔊' : '🔇';
    });
}

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

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
}

// Lobby Actions
createBtn.addEventListener('click', () => {
    const gameType = document.getElementById('game-type').value;
    const timeControl = document.getElementById('time-control').value;
    const isAi = document.getElementById('ai-mode').checked;
    const difficulty = isAi ? parseInt(document.getElementById('ai-difficulty').value) : 1;
    const timeVal = parseInt(timeControl);

    socket.emit('createRoom', {
        gameType,
        timeControl: isNaN(timeVal) ? 0 : timeVal,
        mode: isAi ? 'ai' : 'human',
        difficulty: isNaN(difficulty) ? 1 : difficulty
    });
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
    location.reload();
});

// Socket Events
socket.on('roomCreated', ({ roomId, gameType, timeControl }) => {
    enterRoom(roomId, gameType, timeControl);
});

socket.on('roomJoined', ({ roomId, gameType, timeControl }) => {
    enterRoom(roomId, gameType, timeControl);
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

function enterRoom(roomId, gameType, timeControl) {
    showSection('game-room');
    const timeText = timeControl > 0 ? `${timeControl}m` : '∞';
    // Clean timeControl value
    const tc = timeControl || 0;

    roomIdDisplay.innerText = `Room: ${roomId} (${gameType}) | Time: ${timeText}`;

    // Instantiate Game Client
    if (gameType === 'chess') {
        currentGame = new StandardChessClient(socket, roomId, tc);
    } else if (gameType === 'four-chess') {
        currentGame = new FourPlayerChessClient(socket, roomId, tc);
    } else if (gameType === 'carrom') {
        currentGame = new CarromClient(socket, roomId);
    }

    if (currentGame) {
        currentGame.init();
    }
}
