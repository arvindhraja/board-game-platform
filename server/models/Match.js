const mongoose = require('mongoose');

const matchSchema = mongoose.Schema({
    gameType: { type: String, required: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    spectators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['active', 'finished', 'aborted'], default: 'active' },
    result: {
        winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String, // 'checkmate', 'timeout', 'resignation'
        score: Object
    },
    moves: [{
        player: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Or color
        action: String, // 'e2e4' or JSON string
        timestamp: { type: Date, default: Date.now }
    }],
    analysis: {
        bestMoves: Number,
        mistakes: Number,
        blunders: Number,
        accuracy: Number
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Match', matchSchema);
