# Extended Implementation Plan

## Goal
Enhance the existing board game platform with timers, sound effects, improved UI/UX, and refined game logic for Standard Chess, Four-Player Chess, and Carrom, while maintaining Render compatibility and no-database architecture.

## 1. Backend Updates (`server/`)
-   **`gameManager.js`**: Add timer management logic (decrementing time for active player). Handle timeout events.
-   **`lobby.js`**: Update room creation to accept time controls (e.g., 5 min, 10 min).
-   **`games/chess.js`**:
    -   Validate turn switching with timer updates.
    -   Handle check/checkmate detection more robustly if needed.
-   **`games/fourPlayerChess.js`**:
    -   Implement player elimination logic fully.
    -   Manage 4 separate timers.
-   **`games/carrom.js`**:
    -   Refine physics for better collision detection.
    -   Implement foul/penalty logic (e.g., pocketing striker).

## 2. Frontend Updates (`public/`)
-   **`index.html`**:
    -   Add timer displays for all players.
    -   Add sound toggle button.
    -   Enhance game selection UI (time control options).
-   **`css/styles.css`**:
    -   Add "glow" effects for active player.
    -   Responsive layout improvements.
    -   Animations for moves/strikes.
-   **`js/app.js`**:
    -   Handle timer update events from server.
    -   Play sound effects on specific events.
-   **`js/games/*.js`**:
    -   **Chess**: Add highlighting for legal moves.
    -   **Carrom**: Add power indicator UI for striker.

## 3. Sound Effects (`public/assets/sounds/`)
-   Add simple sound files:
    -   `move.mp3` (Chess move)
    -   `capture.mp3` (Chess capture)
    -   `strike.mp3` (Carrom strike)
    -   `pocket.mp3` (Carrom pocket)
    -   `game-end.mp3`

## 4. Timers Implementation Strategy
-   **Server-side**: Store `timeLeft` for each player and `lastMoveTime`.
-   When a move is made, calculate delta and subtract from current player's time.
-   Broadcast updated times to all clients.
-   Use `setInterval` only when strict enforcement is needed or rely on client-side countdowns synced with server state. *Decision: Server maintains authoritative time, client does visual countdown.*

## 5. Deployment
-   Ensure `package.json` includes all dependencies (no new ones expected, maybe `howler` for client audio if preferred, or vanilla JS `Audio`).
-   Verify `process.env.PORT` usage.

## Checklist
- [ ] Create sound assets (placeholders or download free ones).
- [ ] Implement server-side timer logic.
- [ ] Update frontend to show timers and play sounds.
- [ ] Refine Carrom physics and 4-player chess rules.
- [ ] enhance UI with glow effects and responsive tweaks.
