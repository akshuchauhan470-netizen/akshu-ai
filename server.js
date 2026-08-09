const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
    res.json({
        status: "online",
        message: "Akshu AI Backend is running 🚀"
    });
});

app.post("/api/chat", async (req, res) => {

    try {

        const { message, model } = req.body;

        if (!message) {
            return res.status(400).json({
                error: "Message is required"
            });
        }

        const apiKey =
            process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "OPENROUTER_API_KEY is missing"
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": "https://akshu-ai.onrender.com",
                    "X-Title": "Akshu AI"
                },

                body: JSON.stringify({
                    model: model || "openrouter/free",

                    messages: [
                        {
                            role: "system",
                            content:
                                "You are Akshu AI. Answer naturally in Hinglish. Keep answers clear and friendly."
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "OpenRouter request failed"
            });
        }

        const reply =
            data?.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(500).json({
                error: "AI returned no response"
            });
        }

        res.json({
            reply: reply
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error:
                error.message ||
                "AI connection failed"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Akshu AI backend running on port ${PORT}`
    );
});
