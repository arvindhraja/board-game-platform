# Online Board Game Platform

A real-time multiplayer board game platform built with Node.js, Express, Socket.IO, and MongoDB.
Supports Standard Chess (vs Human or Stockfish AI), Four-Player Chess, and Carrom.

## Features
- **Real-time Multiplayer**: Using Socket.IO for low-latency updates.
- **Authentication**: Secure Signup/Login with JWT and Password Hashing.
- **Persistent Stats**: User profiles, ELO ratings, and Match History stored in MongoDB.
- **Multiple Games**:
  - **Standard Chess**: 2-player classic chess with Stockfish AI (Selectable Difficulty).
  - **Four-Player Chess**: 4-player variant on a 14x14 board (Supports AI fill).
  - **Carrom**: Physics-based striker game (Server-Authoritative).
- **Lobby System**: Create/Join rooms with codes.
- **Responsive UI**: Dark/Light themes, mobile-friendly.

## Tech Stack
- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: Node.js, Express
- Real-time: Socket.IO
- Database: MongoDB

## Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
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
   *Note: This includes `stockfish` engine.*

3. **Configure Environment**
   - Create a `.env` file in the root (see `.env.example`).
   - Add:
     ```
     PORT=5000
     MONGO_URI=mongodb://127.0.0.1:27017/boardgames
     JWT_SECRET=your_super_secret_key_123
     ```

4. **Start the Server**
   ```bash
   npm start
   ```
   Server runs at `http://localhost:5000`.

## Deployment on Render (Free Tier)

This platform is ready for deployment on Render.com's free Web Service tier.

1. **Push to GitHub**
   - Create a new repository on GitHub.
   - Push your code.

2. **Create Web Service on Render**
   - Log in to [Render dashboard](https://dashboard.render.com/).
   - Click "New +" -> "Web Service".
   - Connect your GitHub repository.
   - Settings:
     - **Name**: board-game-platform
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `node server/index.js`
   - **Environment Variables**:
     - `node_env`: `production`
     - `MONGO_URI`: `mongodb+srv://...` (Your Atlas Connection String)
     - `JWT_SECRET`: `...` (Random Long String)

3. **Verify**
   - Render will deploy and provide a URL.
   - Open the URL and test creating/joining rooms.

## Game Rules

### Standard Chess
- Normal FIDE rules apply.
- Play vs Human or Stockfish AI.
- Selectable Difficulty (Easy to Grandmaster).

### Four-Player Chess
- 4 Players: White, Red, Black, Blue.
- Clockwise turn order.
- Last player standing wins.

### Carrom
- Aim with mouse drag.
- Release to strike.
- Server-side physics ensures fair play.
- Pocket coins to score (10 points per coin, -10 for foul).
