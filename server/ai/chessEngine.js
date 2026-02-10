const stockfish = require('stockfish/src/stockfish-17.1-lite-single-03e3232.js');

class ChessAI {
    constructor(difficulty = 1) {
        this.difficulty = difficulty; // 1-20
        this.isReady = false;
        this.engine = null;

        try {
            const temp = stockfish();
            // Check for Promise (WASM often returns a Promise)
            if (temp && typeof temp.then === 'function') {
                temp.then(engine => {
                    this.engine = engine;
                    this.init();
                }).catch(err => console.error("Stockfish Promise Error:", err));
            } else {
                this.engine = temp;
                this.init();
            }
        } catch (e) {
            console.error("Stockfish Constructor Error:", e);
        }
    }

    init() {
        if (!this.engine) return;

        // Verify postMessage exists to avoid crashes
        if (typeof this.engine.postMessage !== 'function') {
            console.error("Stockfish Engine: postMessage is missing. Engine keys:", Object.keys(this.engine));
            return;
        }

        this.engine.onmessage = (line) => {
            if (line === 'readyok') {
                this.isReady = true;
                console.log("Stockfish AI Ready");
            }
        };

        try {
            this.engine.postMessage('uci');
            this.engine.postMessage(`setoption name Skill Level value ${this.difficulty}`);
            this.engine.postMessage('isready');
        } catch (e) {
            console.error("Stockfish postMessage Error:", e);
        }
    }

    async getBestMove(fen) {
        if (!this.engine || !this.isReady) {
            // Try to re-init if engine exists but not ready?
            // Or just return null
            console.warn("AI not ready or engine missing");
            return null;
        }

        return new Promise((resolve) => {
            const originalOnMessage = this.engine.onmessage;

            this.engine.onmessage = (line) => {
                if (line.startsWith('bestmove')) {
                    const parts = line.split(' ');
                    const move = parts[1];
                    this.engine.onmessage = originalOnMessage;

                    if (move && move !== '(none)') {
                        resolve({
                            from: move.substring(0, 2),
                            to: move.substring(2, 4),
                            promotion: move.length > 4 ? move[4] : undefined
                        });
                    } else {
                        resolve(null);
                    }
                }
            };

            this.engine.postMessage(`position fen ${fen}`);
            const depth = Math.min(Math.max(1, this.difficulty), 15);
            this.engine.postMessage(`go depth ${depth}`);
        });
    }
}

module.exports = ChessAI;
