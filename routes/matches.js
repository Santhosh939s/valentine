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
            const senderId = new mongoose.Types.ObjectId(request.senderId);
            const receiverId = new mongoose.Types.ObjectId(request.receiverId);

            const existingMatch = await Match.findOne({
                $or: [
                    { user1: senderId, user2: receiverId },
                    { user1: receiverId, user2: senderId }
                ]
            });
            if (!existingMatch) {
                console.log(`Creating match between ${senderId} and ${receiverId}`);
                await Match.create({
                    user1: senderId,
                    user2: receiverId
                });
            } else {
                console.log(`Match already exists between ${senderId} and ${receiverId}`);
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

const mongoose = require('mongoose');

// Get user's matches
router.get('/matches/mine', protect, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        console.log(`Fetching matches for user ${userId}`);

        const matches = await Match.find({
            $or: [{ user1: userId }, { user2: userId }]
        }).populate('user1', 'name username profilePhoto').populate('user2', 'name username profilePhoto');

        console.log(`Found ${matches.length} matches for ${userId}`);

        const formatted = matches.map(m => {
            // Protect against deleted users
            if (!m.user1 || !m.user2) {
                console.log(`Skipping match ${m._id} due to missing user data`);
                return null;
            }

            const isUser1 = m.user1._id.toString() === userId.toString();
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
        console.error('Error fetching matches:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
