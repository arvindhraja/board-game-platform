# Online Board Game Platform

A real-time multiplayer board game platform built with Node.js, Express, and Socket.IO.
Supports Standard Chess, Four-Player Chess, and Carrom.

## Features
- **Real-time Multiplayer**: Using Socket.IO for low-latency updates.
- **Multiple Games**:
  - **Standard Chess**: 2-player classic chess.
  - **Four-Player Chess**: 4-player variant on a 14x14 board.
  - **Carrom**: Physics-based striker game.
- **Lobby System**: Create/Join rooms with codes.
- **Responsive UI**: Dark/Light themes, mobile-friendly.

## Tech Stack
- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: Node.js, Express
- Real-time: Socket.IO

## Prerequisites
- Node.js (v14+)
- npm

## How to Run Locally

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd board-game-platform
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   Or for development (auto-restart):
   ```bash
   npm run dev 
   # (Requires nodemon: npm install -D nodemon)
   ```

4. **Access the App**
   Open `http://localhost:3000` in your browser.
   Open multiple tabs/windows to simulate multiplayer.

## Deployment on Render (Free Tier)

This platform is ready for deployment on Render.com's free Web Service tier.

1. **Push to GitHub**
   - Create a new repository on GitHub.
   - Push your code:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin <your-repo-url>
     git push -u origin main
     ```

2. **Create Web Service on Render**
   - Log in to [Render dashboard](https://dashboard.render.com/).
   - Click "New +" -> "Web Service".
   - Connect your GitHub repository.
   - Settings:
     - **Name**: board-game-platform
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `node server/index.js`
   - Click "Create Web Service".

3. **Verify**
   - Render will deploy and provide a URL (e.g., `https://board-game-platform.onrender.com`).
   - Open the URL and test creating/joining rooms.

## Game Rules

### Standard Chess
- Normal FIDE rules apply.
- Drag and drop pieces to move.
- Turn-based (White moves first).

### Four-Player Chess
- 4 Players: White, Red, Black, Blue.
- Clockwise turn order.
- Last player standing wins.

### Carrom
- Aim with mouse drag.
- Release to strike.
- Initial turn creates coins.
- Pocket coins to score (simplified logic).

## License
MIT
