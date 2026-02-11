# Extended Implementation Plan

## Goal
Enhance the existing board game platform with timers, sound effects, improved UI/UX, and refined game logic for Standard Chess, Four-Player Chess, and Carrom, while ensuring robust deployment on Render with MongoDB.

## 1. Backend Updates (`server/`)
- [x] **`gameManager.js`**: Add timer management logic (decrementing time for active player). Handle timeout events.
- [x] **`lobby.js`**: Update room creation to accept time controls (e.g., 5 min, 10 min).
- [x] **`games/chess.js`**:
    - [x] Validate turn switching with timer updates.
    - [x] Handle check/checkmate detection robustly.
    - [x] Integrity with Stockfish AI (Selectable Difficulty).
- [x] **`games/fourPlayerChess.js`**:
    - [x] Implement player elimination logic fully.
    - [x] Manage 4 separate timers.
- [x] **`games/carrom.js`**:
    - [x] Refine physics for better collision detection (Server-Side).
    - [x] Implement foul/penalty logic.
- [x] **`auth`**: Signup/Login with JWT/Bcrypt and MongoDB.
- [x] **`models`**: User (ratings, streak) and Match (history) schemas.

## 2. Frontend Updates (`public/`)
- [x] **`index.html`**:
    - [x] Add timer displays for all players.
    - [x] Add sound toggle button.
    - [x] Enhance game selection UI (time control options & AI Difficulty).
- [x] **`css/styles.css`**:
    - [x] Add "glow" effects for active player.
    - [x] Responsive layout improvements.
    - [x] Animations for moves/strikes.
- [x] **`js/app.js`**:
    - [x] Handle timer update events from server.
    - [x] Play sound effects on specific events.
    - [x] Auth integration (Login/Signup/Guest).
- [x] **`js/games/*.js`**:
    - [x] **Chess**: Add highlighting for legal moves, checkmate modal.
    - [x] **Carrom**: Client-side interpolation of server physics.

## 3. Sound Effects (`public/assets/sounds/`)
- [x] Add simple sound files (move, capture, strike, pocket, game-end).

## 4. Timers Implementation Strategy
- [x] **Server-side**: Store `timeLeft` for each player and `lastMoveTime`.
- [x] Broadcast updated times to all clients.

## 5. Deployment
- [x] Ensure `package.json` includes `stockfish` and `mongoose`.
- [x] Create `verify_deployment.js` script.
- [x] Update `README.md` with deployment instructions.

## Checklist
- [x] Create sound assets.
- [x] Implement server-side timer logic.
- [x] Update frontend to show timers and play sounds.
- [x] Refine Carrom physics and 4-player chess rules.
- [x] Enhance UI with glow effects and modals.
- [x] Integrate Stockfish AI.
- [x] Implement Authentication & Database.
