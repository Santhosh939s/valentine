const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const BotMessage = require('../models/BotMessage');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

let ai;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Fallback regex for Telugu songs if AI doesn't provide links or if AI is off
const getTeluguSong = (feeling) => {
    if (feeling.includes('sad') || feeling.includes('lonely')) return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/zOwvX1PqIhs' frameborder='0' allowfullscreen></iframe>";
    if (feeling.includes('motivat')) return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/tKTwK2tq9Z4' frameborder='0' allowfullscreen></iframe>";
    if (feeling.includes('breakup')) return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/uB_iJttIe5U' frameborder='0' allowfullscreen></iframe>";
    return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/WbjnA-bH3j4' frameborder='0' allowfullscreen></iframe>";
};

router.post('/chatbot', protect, async (req, res) => {
    try {
        const { message } = req.body;

        // Process message with AI or fallback
        let botReply = "I am HeartBot! I see you don't have a Gemini API key configured, so my responses are a bit limited right now. Tell me if you want a telugu song!";

        if (ai) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Act as HeartBot, an emotional support AI for a romantic matching website called HeartLink.
                    A user just said: "${message}". 
                    Respond kindly, dynamically, and conversationally. If they ask for a song, especially a telugu song, append the exact string [SONG] at the very end of your reply. Limit response to 1-3 sentences.`
                });
                botReply = response.text;

                if (botReply.includes('[SONG]') || message.toLowerCase().includes('song')) {
                    botReply = botReply.replace('[SONG]', '').trim();
                    botReply += "\n\nHere is a song exactly for that mood:\n" + getTeluguSong(message.toLowerCase());
                }
            } catch (apiErr) {
                console.error("Gemini API Error:", apiErr);
                botReply = "I am having some connection fuzziness to my AI brain, but I'm still here for you.";
            }
        } else if (message.toLowerCase().includes('song')) {
            botReply = "Here is a wonderful Telugu song for you:\n" + getTeluguSong(message.toLowerCase());
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
