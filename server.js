require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;

const OPENROUTER_URL =
    "https://openrouter.ai/api/v1/chat/completions";

const MODELS_URL =
    "https://openrouter.ai/api/v1/models";


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
            MODELS_URL
        );

        const data =
            await response.json();

        if (!response.ok) {

            return res.status(
                response.status
            ).json({
                error:
                    data?.error?.message ||
                    "Could not load models"
            });

        }

        const models =
            (data.data || [])
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
   GET FREE MODELS
========================= */

async function getFreeModels() {

    try {

        const response =
            await fetch(
                MODELS_URL
            );

        const data =
            await response.json();

        if (!response.ok) {
            return [];
        }

        return (data.data || [])
            .filter(model => {

                const id =
                    String(model.id || "")
                        .toLowerCase();

                const pricing =
                    model.pricing || {};

                const promptPrice =
                    Number(
                        pricing.prompt || 0
                    );

                const completionPrice =
                    Number(
                        pricing.completion || 0
                    );

                return (
                    id.includes(":free") ||
                    (
                        promptPrice === 0 &&
                        completionPrice === 0
                    )
                );

            })
            .map(model => model.id)
            .filter(Boolean);

    } catch (error) {

        console.error(
            "FREE MODEL ERROR:",
            error
        );

        return [];

    }

}


/* =========================
   ASK OPENROUTER
========================= */

async function askAI(
    model,
    message
) {

    console.log(
        "Trying model:",
        model
    );

    const response =
        await fetch(
            OPENROUTER_URL,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${API_KEY}`,

                    "HTTP-Referer":
                        "https://akshu-ai.onrender.com",

                    "X-Title":
                        "Akshu AI"

                },

                body:
                    JSON.stringify({

                        model: model,

                        messages: [

                            {
                                role:
                                    "system",

                                content:
                                    "You are Akshu AI. Answer naturally in Hinglish, mixing Hindi and English. Use Devanagari Hindi where appropriate. Keep answers clear, friendly and easy to understand."
                            },

                            {
                                role:
                                    "user",

                                content:
                                    message
                            }

                        ]

                    })

            }
        );


    const data =
        await response.json();


    return {
        response,
        data
    };

}


/* =========================
   CHAT
========================= */

app.post(
    "/api/chat",
    async (req, res) => {

        try {

            const {
                message,
                model
            } = req.body;


            /* MESSAGE CHECK */

            if (
                !message ||
                typeof message !== "string"
            ) {

                return res.status(400).json({
                    error:
                        "Message is required"
                });

            }


            /* API KEY CHECK */

            if (!API_KEY) {

                return res.status(500).json({
                    error:
                        "OPENROUTER_API_KEY is missing"
                });

            }


            /*
             * FIRST TRY:
             * USER SELECTED MODEL
             */

            const modelsToTry = [];


            if (model) {

                modelsToTry.push(
                    model
                );

            }


            /*
             * SECOND:
             * OPENROUTER FREE ROUTER
             */

            if (
                !modelsToTry.includes(
                    "openrouter/free"
                )
            ) {

                modelsToTry.push(
                    "openrouter/free"
                );

            }


            /*
             * THIRD:
             * OTHER FREE MODELS
             */

            const freeModels =
                await getFreeModels();


            for (
                const freeModel
                of freeModels
            ) {

                if (
                    !modelsToTry.includes(
                        freeModel
                    )
                ) {

                    modelsToTry.push(
                        freeModel
                    );

                }

            }


            console.log(
                "Models to try:",
                modelsToTry
            );


            /* =========================
               TRY MODELS ONE BY ONE
            ========================= */

            let lastError =
                "AI request failed";


            for (
                const currentModel
                of modelsToTry
            ) {

                try {

                    const result =
                        await askAI
