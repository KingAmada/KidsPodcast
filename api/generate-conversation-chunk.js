// api/generate-conversation-chunk.js

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { topicText, speakers, previousLines, linesPerChunk, promoText, isFirstChunk, isLastChunk } = req.body;

    if (!topicText || !speakers || speakers.length < 2 || !linesPerChunk) {
        res.status(400).send('Missing or invalid parameters.');
        return;
    }

    try {
        const openai_api_key = process.env.OPENAI_API_KEY;

        // Build speaker descriptions
        const speakerDescriptions = speakers.map(speaker => {
            if (speaker.personalityPrompt) {
                return `${speaker.name}: ${speaker.personalityPrompt}`;
            } else {
                return `${speaker.name}: A friendly and fun character suitable for kids.`;
            }
        }).join('\n');

        // Build the prompt with context from previous lines
        let prompt = `
You are to generate a fun and engaging podcast conversation suitable for kids between the following characters:

${speakerDescriptions}

They are discussing the following topic in a way that is entertaining and easy for children to understand:

"${topicText}"

An advertisement for the following product/service should be included at an appropriate point in the conversation:

"${promoText}"

Instructions:

- Begin the podcast with an exciting introduction where the characters welcome the listeners and mention the topic they will be exploring.
- Use simple language and make the conversation lively, colorful, and animated.
- Include elements of humor, fun facts, and imaginative ideas to keep children engaged.
- Before the advertisement, the characters should mention they are taking a fun break.
- The advertisement should be presented by a new character, "Ad Narrator", who is friendly and energetic.
- After the advertisement, the conversation should resume with enthusiasm.
- Conclude the podcast with the characters providing cheerful closing remarks and thanking the listeners.

Previous conversation:
${previousLines}

Continue the conversation, ensuring coherence with the previous lines. The continuation should:

- Include natural interactions with playful interruptions and expressions.
- Use fillers appropriate for kids like "wow", "cool", "awesome", "let's go".
- Ensure that characters interact in a random order, not following any fixed sequence.
- Vary response lengths: from short exclamations to longer explanations (1-3 sentences).
- Ensure each character's dialogue reflects their personality or instructions as described above.
- Incorporate the advertisement as described.
- Avoid repeating previous content.
- Be approximately ${linesPerChunk} lines long.

Format:

- Start each line with the character's name and dialogue.
- Use "--" for interruptions.

Provide the continuation now.
        `;

        const messages = [
            {
                role: 'system',
                content: prompt
            }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openai_api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: messages,
                max_tokens: 500,
                temperature: 1.0
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            res.status(500).send(`Error generating conversation chunk: ${error.error.message}`);
            return;
        }

        const data = await response.json();
        const conversationText = data.choices[0].message.content.trim();

        res.status(200).json({ conversationText });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('Server error.');
    }
};
