const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const BotMessage = require('../models/BotMessage');
const { generateLocalAIResponse } = require('../utils/chatbotBrain');
const { HfInference } = require('@huggingface/inference');

const router = express.Router();

let hf = null;
if (process.env.HUGGINGFACE_API_KEY) {
    hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
}

router.post('/chatbot', protect, async (req, res) => {
    try {
        const { message } = req.body;
        let botReply = "";

        // Attempt to use Hugging Face for deep conversational AI
        if (hf) {
            try {
                const response = await hf.chatCompletion({
                    model: "Qwen/Qwen2.5-72B-Instruct",
                    messages: [
                        { role: "system", content: "You are HeartBot, an empathetic, supportive, and conversational AI assistant for a romantic dating app. Keep answers short (1-2 sentences). Gently suggest users ask you for a 'Telugu song' if they feel sad or romantic." },
                        { role: "user", content: message }
                    ],
                    max_tokens: 100
                });

                botReply = response.choices[0].message.content.trim();

                // Maintain our Telugu song injection behavior if the user asked for music
                if (message.toLowerCase().includes('song') || message.toLowerCase().includes('music')) {
                    const { generateLocalAIResponse } = require('../utils/chatbotBrain');
                    // We can trick our local brain into just spitting out the iframe by feeding it the music request
                    const localOutput = generateLocalAIResponse(message);
                    if (localOutput.includes('<iframe')) {
                        botReply += "\n\n" + localOutput.substring(localOutput.indexOf('<iframe'));
                    }
                }
            } catch (hfError) {
                console.error("Hugging Face API failed, falling back to local NLP engine:", hfError.message);
                botReply = generateLocalAIResponse(message);
            }
        } else {
            // Instantly use our local custom rule-based Engine (0ms response time, 0 cost)
            botReply = generateLocalAIResponse(message);
        }

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
