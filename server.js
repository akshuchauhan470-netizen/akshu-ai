require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        status: "online",
        message: "Akshu AI Backend is running 🚀"
    });
});

app.post("/api/chat", async (req, res) => {
    const { message, model } = req.body;

    if (!message) {
        return res.status(400).json({
            error: "Message is required"
        });
    }

    if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({
            error: "OPENROUTER_API_KEY is missing"
        });
    }

    try {
        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer":
                        "https://akshuchauhan470-netizen.github.io/akshu-ai/",
                    "X-Title": "Akshu AI"
                },

                body: JSON.stringify({
                    model: model || "openrouter/free",

                    messages: [
                        {
                            role: "system",
                            content:
                                "You are Akshu AI. Always answer naturally in Hinglish, mixing Hindi and English. Use Devanagari Hindi where appropriate and English words where they sound natural. Keep answers clear, friendly and easy to understand."
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
            console.error("OpenRouter error:", data);

            return res.status(response.status).json({
                error:
                    data.error?.message ||
                    "OpenRouter request failed"
            });
        }

        const reply =
            data.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(500).json({
                error: "AI ने कोई जवाब नहीं दिया।"
            });
        }

        return res.json({
            reply: reply
        });

    } catch (error) {
        console.error("Server error:", error);

        return res.status(500).json({
            error: "AI connection failed"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Akshu AI running on port ${PORT}`);
});
