const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const UserMessage = require('../models/UserMessage');

const router = express.Router();

// Get total unread count and grouped by sender for the current user
router.get('/messages/unread', protect, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const unreadMessages = await UserMessage.find({
            receiverId: userId,
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
router.get('/messages/:matchId', protect, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const matchId = new mongoose.Types.ObjectId(req.params.matchId);

        const messages = await UserMessage.find({
            $or: [
                { senderId: userId, receiverId: matchId },
                { senderId: matchId, receiverId: userId }
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
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const partnerId = new mongoose.Types.ObjectId(req.params.partnerId);

        await UserMessage.updateMany(
            { senderId: partnerId, receiverId: userId, read: false },
            { $set: { read: true } }
        );
        res.json({ message: 'Messages marked as read' });
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
