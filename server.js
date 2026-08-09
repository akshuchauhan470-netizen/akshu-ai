const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.use(cors());
app.use(express.json());

/* =========================
   SERVE FRONTEND
========================= */

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

/* =========================
   MODELS
========================= */

app.get("/api/models", (req, res) => {

    const models = [

        {
            id: "openrouter/free",
            name: "Free AI"
        },

        {
            id: "openai/gpt-5.6",
            name: "GPT-5.6"
        },

        {
            id: "google/gemini-3.1-flash-lite",
            name: "Gemini 3.1 Flash Lite"
        },

        {
            id: "anthropic/claude-sonnet-4.5",
            name: "Claude Sonnet"
        }

    ];

    res.json(models);

});

/* =========================
   AI CHAT
========================= */

app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;
        const model = req.body.model || "openrouter/free";

        if (!message) {

            return res.status(400).json({
                error: "Message is required"
            });

        }

        if (!OPENROUTER_API_KEY) {

            return res.status(500).json({
                error: "OPENROUTER_API_KEY is missing"
            });

        }

        console.log("User message:", message);
        console.log("Selected model:", model);

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${OPENROUTER_API_KEY}`,

                    "HTTP-Referer":
                        "https://akshu-ai.onrender.com",

                    "X-Title":
                        "Akshu AI"

                },

                body: JSON.stringify({

                    model: model,

                    messages: [

                        {
                            role: "user",
                            content: message
                        }

                    ]

                })

            }
        );

        const data = await response.json();

        console.log(
            "OpenRouter status:",
            response.status
        );

        console.log(
            "OpenRouter response:",
            JSON.stringify(data)
        );

        if (!response.ok) {

            return res.status(response.status).json({

                error:
                    data?.error?.message ||
                    data?.error ||
                    "OpenRouter request failed",

                details: data

            });

        }

        const reply =
            data?.choices?.[0]?.message?.content ||
            "No response received.";

        return res.json({

            reply: reply

        });

    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );

        return res.status(500).json({

            error:
                error.message ||
                "Internal server error"

        });

    }

});

/* =========================
   404
========================= */

app.use((req, res) => {

    res.status(404).json({

        error: "Route not found"

    });

});

/* =========================
   START SERVER
========================= */

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Akshu AI running on port ${PORT}`
    );

});
