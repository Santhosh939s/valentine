const mongoose = require('mongoose');

const userMessageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String }, // Plaintext will not be stored if encryptedMessage is preferred for security
    encryptedMessage: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('UserMessage', userMessageSchema);
