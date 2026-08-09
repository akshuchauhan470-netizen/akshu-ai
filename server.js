require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

/* =========================
   BASIC SETUP
========================= */

app.use(cors());

app.use(express.json());

/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
    res.json({
        status: "online",
        message: "Akshu AI Backend is running 🚀"
    });
});

/* =========================
   MODELS
========================= */

app.get("/api/models", async (req, res) => {

    try {

        const response = await fetch(
            "https://openrouter.ai/api/v1/models"
        );

        const data = await response.json();

        if (!response.ok) {

            return res.status(response.status).json({
                error:
                    data.error?.message ||
                    "Could not load models"
            });

        }

        const models = (data.data || [])
            .filter(model => model.id)
            .map(model => ({
                id: model.id,
                name:
                    model.name ||
                    model.id
            }));

        res.json(models);

    } catch (error) {

        console.error(
            "MODELS ERROR:",
            error
        );

        res.status(500).json({
            error:
                error.message ||
                "Could not load models"
        });
    }

});

/* =========================
   AI CHAT
========================= */

app.post("/api/chat", async (req, res) => {

    try {

        const {
            message,
            model
        } = req.body;


        /* CHECK MESSAGE */

        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {

            return res.status(400).json({
                error: "Message is required"
            });

        }


        /* CHECK API KEY */

        const apiKey =
            process.env.OPENROUTER_API_KEY;


        if (!apiKey) {

            console.error(
                "OPENROUTER_API_KEY is missing"
            );

            return res.status(500).json({
                error:
                    "OPENROUTER_API_KEY is missing"
            });

        }


        /* MODEL */

        const selectedModel =
            model ||
            "openrouter/free";


        console.log(
            "AI REQUEST:",
            selectedModel
        );


        /* OPENROUTER REQUEST */

        const response =
            await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`,

                        "HTTP-Referer":
                            "https://akshu-ai.onrender.com",

                        "X-Title":
                            "Akshu AI"

                    },

                    body:
                        JSON.stringify({

                            model:
                                selectedModel,

                            messages: [

                                {
                                    role:
                                        "system",

                                    content:
                                        "You are Akshu AI. Always answer naturally in Hinglish, mixing Hindi and English. Use Devanagari Hindi where appropriate and English words where they sound natural. Keep answers clear, friendly and easy to understand."
                                },

                                {
                                    role:
                                        "user",

                                    content:
                                        message.trim()
                                }

                            ]

                        })

                }
            );


        /* GET RESPONSE */

        const data =
            await response.json();


        console.log(
            "OPENROUTER STATUS:",
            response.status
        );


        /* OPENROUTER ERROR */

        if (!response.ok) {

            console.error(
                "OPENROUTER ERROR:",
                data
            );

            return res
                .status(response.status)
                .json({

                    error:
                        data?.error?.message ||
                        data?.error ||
                        "OpenRouter request failed"

                });

        }


        /* GET AI REPLY */

        const reply =
            data?.choices?.[0]?.message?.content;


        if (!reply) {

            console.error(
                "NO AI REPLY:",
                data
            );

            return res.status(500).json({

                error:
                    "AI returned no response"

            });

        }


        /* SUCCESS */

        return res.json({

            reply: reply

        });


    } catch (error) {

        console.error(
            "CHAT ERROR:",
            error
        );

        return res.status(500).json({

            error:
                error.message ||
                "AI connection failed"

        });

    }

});


/* =========================
   START SERVER
========================= */

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Akshu AI Backend running on port ${PORT}`
        );

    }
);
