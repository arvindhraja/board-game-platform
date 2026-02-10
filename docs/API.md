# Board Game Platform API Documentation

## Auth Endpoints
### User Signup
*   **URL**: `/api/auth/signup`
*   **Method**: `POST`
*   **Body**:
    *   `username` (string, required)
    *   `email` (string, required)
    *   `password` (string, required)
*   **Response**:
    *   `201 Created`: Returns User object and JWT Token.
    *   `400 Bad Request`: User already exists.

### User Login
*   **URL**: `/api/auth/login`
*   **Method**: `POST`
*   **Body**:
    *   `email` (string, required)
    *   `password` (string, required)
*   **Response**:
    *   `200 OK`: Returns User object and JWT Token.
    *   `401 Unauthorized`: Invalid credentials.

### User Profile
*   **URL**: `/api/auth/profile`
*   **Method**: `GET`
*   **Headers**:
    *   `Authorization`: `Bearer <token>`
*   **Response**:
    *   `200 OK`: Returns current user's profile, stats, streak, history.

## Match Endpoints
### Get Match History
*   **URL**: `/api/matches/user/:userId`
*   **Method**: `GET`
*   **Headers**: `Authorization: Bearer <token>`
*   **Response**: List of match summaries.

### Get Match Details
*   **URL**: `/api/matches/:id`
*   **Method**: `GET`
*   **Response**: Full match details including moves and players.

### Analyze Match (Chess Only)
*   **URL**: `/api/matches/:id/analyze`
*   **Method**: `POST`
*   **Response**: Trigger background analysis. (Currently returns placeholder message).

## Socket.IO Events
### Connection
*   Send `auth: { token: "JWT_TOKEN" }` in handshake to authenticate.

### Client -> Server Events
*   `createRoom`: `{ gameType: "chess" | "chess-ai" | "carrom" | "carrom-ai", timeControl: number }`
*   `joinRoom`: `{ roomId: string }`
*   `gameAction`: `{ roomId: string, action: string, data: object }`
    *   Chess Actions: `move` (`from`, `to`, `promotion`), `getState`
    *   Carrom Actions: `shoot` (`angle`, `power`, `positionX`), `endTurn` (`coins`, `striker`, `switchTurn`)
*   `sendMessage`: `{ roomId: string, message: string }`

### Server -> Client Events
*   `roomCreated`: `{ roomId, ... }`
*   `roomJoined`: `{ roomId, role: "player" | "spectator", ... }`
*   `playerJoined`: `{ playerId, username, count }`
*   `gameUpdate`: `{ fen, turn, lastMove, ... }` (Chess) or `{ event: "shoot", ... }` (Carrom)
*   `receiveMessage`: `{ sender, message }`
*   `error`: `{ message }`
