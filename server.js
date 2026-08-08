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
                        `Bearer ${process.env.OPENROUTER_API_KEY}`
                },

                body: JSON.stringify({

                    model: model || "openrouter/free",

                    messages: [

                        {
                            role: "system",
                            content:
                                "You are Akshu AI. Always answer naturally in Hinglish, mixing Hindi and English. Use Devanagari Hindi where appropriate and English words where they sound natural. Do not give unnecessarily formal or fully English answers unless the user specifically asks for English. Keep answers clear, friendly and easy to understand."
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
                    data.error?.message ||
                    "AI request failed"
            });

        }

        const reply =
            data.choices?.[0]?.message?.content;

        res.json({
            reply:
                reply ||
                "AI ने कोई जवाब नहीं दिया।"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "AI connection failed"
        });
    }
});


app.listen(3000, () => {

    console.log(
        "Akshu AI running at http://localhost:3000"
    );

});