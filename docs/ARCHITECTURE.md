# Board Game Platform - Implementation Overview

## 1. System Architecture
The backend is built using a monolithic Node.js Application hosted on Render (initially), utilizing:
- **Express.js**: For HTTP API (Auth, Matches, Analysis).
- **Socket.IO**: For real-time bi-directional communication (Game Events, Chat).
- **MongoDB (Mongoose)**: Document store for Users, Matches, and Analytics.
- **Stockfish (WASM/JS)**: Server-side Chess AI engine.

### Diagrams
**User Interaction Flow:**
User (Browser) <-> Socket.IO (Lobby/Game Manager) <-> GameManager (Logic) <-> Stockfish (AI)
User (Browser) <-> REST API (Auth/History) <-> Database

## 2. Core Components

### A. Authentication & User Management
- **JWT (JSON Web Tokens)**: Used for stateless authentication.
- **Bcrypt**: Password hashing.
- **User Schema**: Stores `username`, `email`, `password_hash`, `ratings` (Elo per game), `history` (summary), and `streak`.
    - **Streak Logic**: Computed on `endGame`. If played yesterday/today, increment. Else reset.

### B. Real-Time Game Engine (`server/games/`)
- **Chess (`chess.js`)**:
    - Validates every move on server.
    - Manages timer (server-side authoritative clock).
    - Syncs `FEN` state to clients.
- **Carrom (Physics Relay)**:
    - Server: Validates turn order.
    - Client: Simulates physics (Box2D/Custom).
    - Server: Relays `shoot` parameters to opponent for deterministic replay.
    - AI: Simulated by Server calculating shot parameters and broadcasting them.

### C. Game Manager (`server/gameManager.js`)
- Singleton per Room? No, instantiated per Room.
- Manages:
    - Player Assignments (White/Black, P1/P2/AI).
    - Turn Enforcement.
    - Move Validation.
    - Timer Loop.
    - AI Wrapper Interaction.
    - `endGame` Persistence (writes to MongoDB).

### D. AI Integration (`server/ai/`)
- **Chess**: Wraps `stockfish.js`.
    - `getBestMove(fen)` -> Returns Promise.
    - Difficulty levels mapped to Stockfish skill levels.
- **Carrom**: Rule-based heuristic engine.
    - `calculateShot(state)` -> Returns angle/power.

## 3. Deployment & Scalability
- **Render Free Tier Compatibility**:
    - In-memory game state (not persistent across restarts, acceptable for MVP).
    - `dotenv` for configuration.
    - Single instance (no Redis adapter needed yet).
- **Future Considerations**:
    - Redis Adapter for Socket.IO (Scaling horizontally).
    - Worker Threads for AI (heavy compute off main thread).

## 4. Database Schema
- **User**: `username`, `email`, `password`, `ratings: { chess, fourchess, carrom }`, `streak: { current, lastPlayed }`.
- **Match**: `players: [User, User]`, `result: { winner, reason }`, `moves: [{ action, timestamp }]`, `analysis: { accuracy, blunders }`.

## 5. Security
- Socket Handshake validates JWT.
- Routes Protected by `protect` middleware.
- Input validation on moves (via `chess.js`).
