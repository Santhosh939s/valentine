const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Feedback = require('../models/Feedback');

const router = express.Router();

// User submits feedback
router.post('/feedback', protect, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'Feedback message is required' });

        const feedback = await Feedback.create({
            userId: req.user.id,
            message
        });

        res.status(201).json({ message: 'Feedback submitted successfully', feedback });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin views all feedback
router.get('/feedback', protect, admin, async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('userId', 'name email username')
            .sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin views all registered users
router.get('/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
