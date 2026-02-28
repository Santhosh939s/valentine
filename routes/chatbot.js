const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const BotMessage = require('../models/BotMessage');
const { generateLocalAIResponse } = require('../utils/chatbotBrain');

const router = express.Router();

router.post('/chatbot', protect, async (req, res) => {
    try {
        const { message } = req.body;

        // Generate response using our local custom rule-based Engine (0ms response time, 0 cost)
        const botReply = generateLocalAIResponse(message);

        // Save to DB
        const botMessage = await BotMessage.create({
            userId: req.user.id,
            message,
            botReply
        });

        res.json(botMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/chatbot/history', protect, async (req, res) => {
    try {
        const history = await BotMessage.find({ userId: req.user.id }).sort({ createdAt: 1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
