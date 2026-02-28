// Custom Local AI Chatbot Brain
// A lightweight rule-based NLP engine optimized for emotional support and romantic dating contexts.

const categories = {
    greetings: {
        keywords: ['hi', 'hello', 'hey', 'morning', 'evening', 'whatsup', "what's up", 'howdy', 'namaste'],
        responses: [
            "Hi there! How are you feeling today?",
            "Hello! I'm HeartBot. How can I support you right now?",
            "Hey! It's great to see you. What's on your mind?",
            "Hi! Ready to chat or do you want me to suggest a song?",
        ]
    },
    sadness: {
        keywords: ['sad', 'depressed', 'cry', 'crying', 'unhappy', 'down', 'hurting', 'pain', 'heartbroken', 'heartbreak', 'grief', 'miserable'],
        responses: [
            "I'm really sorry you're feeling that way. It's completely okay to feel sad sometimes. I'm here for you.",
            "Sending you a big virtual hug. Things might feel heavy now, but you won't feel this way forever.",
            "That sounds really tough. Please remember to be gentle with yourself right now.",
            "I hear you. Sometimes the best thing to do is just let the feelings flow. I'm right here listening.",
        ],
        suggestsSong: true
    },
    loneliness: {
        keywords: ['lonely', 'alone', 'isolated', 'nobody', 'no one', 'friendless'],
        responses: [
            "Feeling lonely is so hard, but please know you're not actually alone. I'm right here with you.",
            "Loneliness can be a heavy blanket. Why don't we chat for a bit to lighten the load?",
            "You matter, and your presence in this world is important. Let's hang out here together.",
        ],
        suggestsSong: true
    },
    love_crush: {
        keywords: ['love', 'crush', 'butterflies', 'romantic', 'date', 'infatuated', 'obsessed', 'feelings for', 'like him', 'like her'],
        responses: [
            "Ooo, that's exciting! Having a crush makes everything feel a little brighter. Tell me more about them!",
            "Love is in the air! It's wonderful that you're experiencing those feelings. What is your favorite thing about them?",
            "Romantic feelings can be thrilling and terrifying at the same time! Trust your heart and take it one step at a time.",
            "That's so sweet! Don't be afraid to put yourself out there when you feel ready."
        ],
        suggestsSong: true // Often happy/romantic songs
    },
    breakup: {
        keywords: ['breakup', 'broke up', 'ex', 'cheated', 'left me', 'over'],
        responses: [
            "Breakups are incredibly painful. Give yourself permission to grieve the loss of the relationship.",
            "I'm so sorry. Healing is not linear, so take all the time you need. You will get through this.",
            "Losing someone you cared about hurts deeply. Please make sure to prioritize your own comfort right now."
        ],
        suggestsSong: true
    },
    motivation: {
        keywords: ['unmotivated', 'stuck', 'lost', 'giving up', 'give up', 'tired', 'exhausted', 'failure', 'can\'t do this', 'cannot do this'],
        responses: [
            "You are stronger than you realize. Take a deep breath, and just focus on the very next step.",
            "It's okay to rest when you're tired, but don't quit. You have so much potential inside you.",
            "Every expert was once a beginner, and every success story is filled with setbacks. Keep going!",
            "I believe in you! Even small progress is still progress."
        ],
        suggestsSong: true
    },
    smalltalk: {
        keywords: ['how are you', 'what are you doing', 'who are you', 'name'],
        responses: [
            "I'm HeartBot! I don't have feelings myself, but I'm dedicated entirely to supporting yours!",
            "I'm doing great, just floating around in the code, waiting to chat with wonderful people like you.",
            "I'm an AI companion created for HeartLink. My purpose is to listen, support, and suggest great music!",
        ]
    }
};

const getTeluguSong = (category, userMessage) => {
    // Determine the type of song based on the parsed category
    if (category === 'sadness' || category === 'loneliness') {
        return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/zOwvX1PqIhs' frameborder='0' allowfullscreen></iframe>";
    }
    if (category === 'breakup') {
        return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/uB_iJttIe5U' frameborder='0' allowfullscreen></iframe>";
    }
    if (category === 'motivation') {
        return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/tKTwK2tq9Z4' frameborder='0' allowfullscreen></iframe>";
    }
    if (category === 'love_crush' || userMessage.toLowerCase().includes('song')) {
        return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/WbjnA-bH3j4' frameborder='0' allowfullscreen></iframe>";
    }

    // Fallback default
    return "<iframe width='100%' height='200' src='https://www.youtube.com/embed/WbjnA-bH3j4' frameborder='0' allowfullscreen></iframe>";
};

const generateLocalAIResponse = (message) => {
    const cleanMessage = message.toLowerCase().replace(/[^\w\s\']/g, ""); // Keep alphanumeric, spaces, and apostrophes
    const words = cleanMessage.split(/\s+/);

    let maxScore = 0;
    let bestCategory = null;

    // Score Categories based on Keyword Matching
    for (const [catName, catData] of Object.entries(categories)) {
        let score = 0;
        for (const keyword of catData.keywords) {
            // Check for exact word matches or phrase matching
            if (cleanMessage.includes(keyword)) {
                // Heuristic: longer keywords/phrases weight slightly higher
                score += keyword.split(' ').length;
            }
        }

        if (score > maxScore) {
            maxScore = score;
            bestCategory = catName;
        }
    }

    let responseText = "";
    let willSuggestSong = false;

    // Pick response
    if (bestCategory) {
        const responses = categories[bestCategory].responses;
        responseText = responses[Math.floor(Math.random() * responses.length)];
        if (categories[bestCategory].suggestsSong) {
            willSuggestSong = true;
        }
    } else {
        // Universal Default
        const defaults = [
            "I hear what you're saying. Tell me more.",
            "That's interesting. How does that make you feel?",
            "I'm always here to listen. Go on.",
            "That makes sense. I'm right here with you."
        ];
        responseText = defaults[Math.floor(Math.random() * defaults.length)];
    }

    // Explicit Song Requests override standard response appending
    if (cleanMessage.includes('song') || cleanMessage.includes('music')) {
        willSuggestSong = true;
        // If they ONLY asked for a song and nothing else matched, be polite
        if (!bestCategory) {
            responseText = "I'd love to share some music with you!";
        }
    }

    // Append Song if necessary
    if (willSuggestSong) {
        responseText += "\n\nHere is a song that might fit the mood:\n" + getTeluguSong(bestCategory, message);
    }

    return responseText;
};

module.exports = {
    generateLocalAIResponse
};
