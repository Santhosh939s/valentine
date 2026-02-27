const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const UserMessage = require('../models/UserMessage');

const router = express.Router();

// Get chat history between current user and a matched user
router.get('/messages/:matchId', protect, async (req, res) => {
    try {
        const { matchId } = req.params;

        const messages = await UserMessage.find({
            $or: [
                { senderId: req.user.id, receiverId: matchId },
                { senderId: matchId, receiverId: req.user.id }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Save a new message (encrypted) via HTTP - Note: Real-time is handled via Socket.io
router.post('/messages', protect, async (req, res) => {
    try {
        const { receiverId, encryptedMessage } = req.body;

        const msg = await UserMessage.create({
            senderId: req.user.id,
            receiverId,
            encryptedMessage
        });

        res.status(201).json(msg);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
