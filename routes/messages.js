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

// Mark messages from a specific partner as read
router.put('/messages/read/:partnerId', protect, async (req, res) => {
    try {
        const { partnerId } = req.params;
        await UserMessage.updateMany(
            { senderId: partnerId, receiverId: req.user.id, read: false },
            { $set: { read: true } }
        );
        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get total unread count and grouped by sender for the current user
router.get('/messages/unread', protect, async (req, res) => {
    try {
        const unreadMessages = await UserMessage.find({
            receiverId: req.user.id,
            read: false
        });

        const totalUnread = unreadMessages.length;
        const bySender = {};

        unreadMessages.forEach(msg => {
            if (!bySender[msg.senderId]) bySender[msg.senderId] = 0;
            bySender[msg.senderId]++;
        });

        res.json({ totalUnread, bySender });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get chat history between current user and a matched user
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
