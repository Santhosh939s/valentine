require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const authRoutes = require('../routes/auth');
const profileRoutes = require('../routes/profile');
const matchRoutes = require('../routes/matches');
const chatbotRoutes = require('../routes/chatbot');
const messageRoutes = require('../routes/messages');
const adminRoutes = require('../routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow all origins for dev
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', matchRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api', messageRoutes);
app.use('/api/admin', adminRoutes);

// Wildcard route to serve index.html for unknown frontend routes
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Track online users for admin dashboard
let onlineUsersCount = 0;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Keep timeout short just in case
}).then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Socket.io for Real-Time Chat
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', ({ userId, matchId }) => {
        // Basic room setup: room name can be the sorted combination of both user IDs
        const room = [userId, matchId].sort().join('_');
        socket.join(room);
        console.log(`User ${userId} joined room ${room}`);
    });

    socket.on('chatMessage', (data) => {
        const { senderId, receiverId, message, encryptedMessage } = data;
        const room = [senderId, receiverId].sort().join('_');

        // Broadcast to room
        io.to(room).emit('message', data);
    });

    socket.on('typing', (data) => {
        const { senderId, receiverId } = data;
        const room = [senderId, receiverId].sort().join('_');
        socket.to(room).emit('typing', { senderId });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export app for Vercel Serverless
module.exports = app;
