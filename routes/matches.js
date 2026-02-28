const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Request = require('../models/Request');
const Match = require('../models/Match');

const router = express.Router();

// Get recommended matches based on interests and lookingFor
router.get('/matches', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ message: 'User not found' });

        const existingRequests = await Request.find({
            $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
        });

        const existingMatches = await Match.find({
            $or: [{ user1: req.user.id }, { user2: req.user.id }]
        });

        // Fetch remaining users except self
        const users = await User.find({ _id: { $ne: req.user.id } }).select('-password');

        let recommended = users.map(user => {
            let score = 0;
            if (user.lookingFor && currentUser.lookingFor && user.lookingFor.toLowerCase() === currentUser.lookingFor.toLowerCase()) {
                score += 30;
            }

            const sharedInterests = user.interests.filter(i => currentUser.interests.includes(i));
            score += sharedInterests.length * 10;

            const matchPercentage = Math.max(10, Math.min(score, 99));

            let connectionStatus = 'none';
            const isMatch = existingMatches.find(m => m.user1.toString() === user._id.toString() || m.user2.toString() === user._id.toString());

            if (isMatch) {
                connectionStatus = 'accepted';
            } else {
                const reqSent = existingRequests.find(r => r.senderId.toString() === req.user.id && r.receiverId.toString() === user._id.toString());
                const reqReceived = existingRequests.find(r => r.receiverId.toString() === req.user.id && r.senderId.toString() === user._id.toString());

                if (reqSent) {
                    connectionStatus = reqSent.status === 'pending' ? 'pending_sent' : reqSent.status;
                } else if (reqReceived) {
                    connectionStatus = reqReceived.status === 'pending' ? 'pending_received' : reqReceived.status;
                }
            }

            return {
                ...user.toObject(),
                matchPercentage,
                connectionStatus
            };
        });

        recommended.sort((a, b) => b.matchPercentage - a.matchPercentage);

        res.json(recommended);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Send a match request
router.post('/request', protect, async (req, res) => {
    try {
        const { receiverId } = req.body;

        const existing = await Request.findOne({ senderId: req.user.id, receiverId });
        if (existing) return res.status(400).json({ message: 'Request already sent' });

        const request = await Request.create({
            senderId: req.user.id,
            receiverId
        });

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Respond to a request
router.post('/request/respond', protect, async (req, res) => {
    try {
        const { requestId, status } = req.body;
        const request = await Request.findById(requestId);

        if (!request || request.receiverId.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Request not found or invalid' });
        }

        request.status = status;
        await request.save();

        if (status === 'accepted') {
            const existingMatch = await Match.findOne({
                $or: [
                    { user1: request.senderId, user2: request.receiverId },
                    { user1: request.receiverId, user2: request.senderId }
                ]
            });
            if (!existingMatch) {
                await Match.create({
                    user1: request.senderId,
                    user2: request.receiverId
                });
            }
        }

        res.json({ message: `Request ${status}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get current user's requests (both incoming and sent)
router.get('/request', protect, async (req, res) => {
    try {
        const incoming = await Request.find({ receiverId: req.user.id, status: 'pending' })
            .populate('senderId', 'name username age profilePhoto');

        const sent = await Request.find({ senderId: req.user.id })
            .populate('receiverId', 'name username age profilePhoto');

        res.json({ incoming, sent });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's matches
router.get('/matches/mine', protect, async (req, res) => {
    try {
        const matches = await Match.find({
            $or: [{ user1: req.user.id }, { user2: req.user.id }]
        }).populate('user1', 'name username profilePhoto').populate('user2', 'name username profilePhoto');

        const formatted = matches.map(m => {
            // Protect against deleted users
            if (!m.user1 || !m.user2) return null;

            const isUser1 = m.user1._id.toString() === req.user.id;
            const partner = isUser1 ? m.user2 : m.user1;

            return {
                matchId: m._id,
                partnerId: partner._id,
                name: partner.name,
                username: partner.username,
                profilePhoto: partner.profilePhoto
            };
        }).filter(m => m !== null);

        res.json({ matches: formatted });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
