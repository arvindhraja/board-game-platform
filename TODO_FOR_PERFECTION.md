# 🚀 Project Completion Checklist

To make the **Board Game Arena** work perfectly, you need to address the following 3 key areas:

## 1. Database Connection (CRITICAL)
**Current Status:**  
matches/users are NOT being saved because the MongoDB connection string is invalid (`Error: querySrv ENOTFOUND`).

**Action Required:**
1.  **Get a MongoDB URI**:
    *   Go to [MongoDB Atlas](https://www.mongodb.com/start).
    *   Create a free cluster.
    *   Get your connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/boardgame?retryWrites=true&w=majority`).
2.  **Update `.env`**:
    *   Open the `.env` file in the root directory.
    *   Replace `MONGO_URI=...` with your actual connection string.
    *   Restart the server (`Ctrl+C` then `npm run start`).

## 2. Chess AI Engine (Stockfish)
**Current Status:**  
The local `stockfish` library is failing to initialize in this environment (`postMessage is missing`), so the AI falls back to a **Random Mover** (very easy to beat).

**Action Required:**
*   **On Your Local Machine**:
    *   The current code *might* work if you have the `stockfish` npm package installed correctly and your Node.js environment supports WASM.
    *   Run `npm install stockfish` again to ensure it's untainted.
*   **Alternative (Recommended for Web)**:
    *   Switch to using a **Public Stockfish API** (like `https://stockfish.online/api/s/v2.php`) instead of running it locally on the server. This removes the heavy processing from your server and ensures reliability.

## 3. Game Polish (Recommended)
*   **Carrom Physics**: The current physics are client-side only and basic. For a "perfect" experience, you might want to implement server-side physics verification to prevent cheating.
*   **4-Player Chess UI**: Ensure the board rotates correctly for each player (currently static from one perspective).

---

### How to Run Successfully
1.  `npm install`
2.  Set `MONGO_URI` in `.env`.
3.  `node server/index.js`
4.  Open `http://localhost:5000`.
