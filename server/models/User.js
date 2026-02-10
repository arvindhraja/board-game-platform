const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    ratings: {
        chess: { type: Number, default: 1200 },
        fourchess: { type: Number, default: 1200 },
        carrom: { type: Number, default: 1200 }
    },
    history: [{
        gameType: String,
        result: String, // 'win', 'loss', 'draw'
        opponent: String,
        timestamp: { type: Date, default: Date.now }
    }],
    streak: {
        current: { type: Number, default: 0 },
        lastPlayed: { type: Date }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
