const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check user exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            history: [],
            streak: { current: 0 }
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            // Update streak last played logic? Or only on game finish?
            // On Login, check streak expiration? 
            // Better do it on game play.

            res.json({
                _id: user.id,
                username: user.username,
                email: user.email,
                ratings: user.ratings,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ msg: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

const { protect } = require('../middleware/auth');

// @route   GET /api/auth/profile
router.get('/profile', protect, async (req, res) => {
    res.json({
        _id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        ratings: req.user.ratings,
        history: req.user.history, // Might want to limit this or paginate in future
        streak: req.user.streak
    });
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = router;
