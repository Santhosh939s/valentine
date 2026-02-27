const mongoose = require('mongoose');

const botMessageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    botReply: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('BotMessage', botMessageSchema);
