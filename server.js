const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

const PORT = process.env.PORT || 10000;

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY;


/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json());


/*
   Temporary file upload storage.
   Files are kept in memory and sent
   directly to the AI request.
*/

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});


/* =========================
   HOME
========================= */

app.get("/", (req, res) => {

    res.json({
        status: "ok",
        message: "Akshu AI backend is running."
    });

});


/* =========================
   MODELS
========================= */

app.get("/api/models", (req, res) => {

    res.json([

        {
            id: "openrouter/free",
            name: "Free AI"
        },

        {
            id: "openai/gpt-4o-mini",
            name: "GPT-4o Mini"
        },

        {
            id: "google/gemini-2.0-flash-001",
            name: "Gemini Flash"
        }

    ]);

});


/* =========================
   CHAT
========================= */

app.post(
    "/api/chat",
    upload.single("file"),
    async (req, res) => {

        try {

            if (!OPENROUTER_API_KEY) {

                return res.status(500).json({
                    error:
                        "OPENROUTER_API_KEY is missing in Render Environment Variables."
                });

            }


            const message =
                req.body.message || "";


            const model =
                req.body.model ||
                "openrouter/free";


            const file =
                req.file;


            /*
               At least text or a file
               must be provided.
            */

            if (
                !message.trim() &&
                !file
            ) {

                return res.status(400).json({
                    error:
                        "Message or file is required."
                });

            }


            /* =========================
               BUILD USER CONTENT
            ========================= */

            const content = [];


            if (message.trim()) {

                content.push({
                    type: "text",
                    text: message
                });

            }


            /*
               Image support.

               PNG / JPG / WEBP are converted
               to a data URL.
            */

            if (
                file &&
                file.mimetype.startsWith("image/")
            ) {

                const base64 =
                    file.buffer.toString("base64");


                const imageUrl =
                    `data:${file.mimetype};base64,${base64}`;


                content.push({

                    type: "image_url",

                    image_url: {
                        url: imageUrl
                    }

                });

            }


            /*
               PDF / TXT and other files:
               For now we don't pretend the AI
               can understand every file format.

               TXT is read directly.
            */

            if (
                file &&
                file.mimetype === "text/plain"
            ) {

                const fileText =
                    file.buffer.toString("utf8");


                content.push({

                    type: "text",

                    text:
                        "\n\nAttached text file:\n" +
                        fileText

                });

            }


            /*
               PDF is acknowledged.
               Full PDF parsing requires a PDF
               parser package.
            */

            if (
                file &&
                file.mimetype === "application/pdf"
            ) {

                content.push({

                    type: "text",

                    text:
                        `\n\nThe user attached a PDF file named "${file.originalname}".`

                });

            }


            /*
               Other supported files.
            */

            if (
                file &&
                !file.mimetype.startsWith("image/") &&
                file.mimetype !== "text/plain" &&
                file.mimetype !== "application/pdf"
            ) {

                content.push({

                    type: "text",

                    text:
                        `\n\nThe user attached a file named "${file.originalname}" with type "${file.mimetype}".`

                });

            }


            /* =========================
               OPENROUTER REQUEST
            ========================= */

            const response =
                await fetch(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {

                        method: "POST",

                        headers: {

                            "Authorization":
                                `Bearer ${OPENROUTER_API_KEY}`,

                            "Content-Type":
                                "application/json",

                            "HTTP-Referer":
                                "https://akshu-ai.github.io",

                            "X-Title":
                                "Akshu AI"

                        },

                        body: JSON.stringify({

                            model: model,

                            messages: [

                                {
                                    role: "system",

                                    content:
                                        "You are Akshu AI. Answer clearly, helpfully, and accurately. Do not read emojis aloud or include unnecessary emojis."
                                },

                                {
                                    role: "user",

                                    content:
                                        content

                                }

                            ]

                        })

                    }
                );


            /* =========================
               READ RESPONSE
            ========================= */

            const data =
                await response.json();


            console.log(
                "OpenRouter status:",
                response.status
            );


            if (!response.ok) {

                console.error(
                    "OpenRouter error:",
                    data
                );


                return res.status(
                    response.status
                ).json({

                    error:
                        data?.error?.message ||
                        "OpenRouter request failed."

                });

            }


            const reply =
                data?.choices?.[0]?.message?.content;


            if (!reply) {

                return res.status(500).json({

                    error:
                        "AI returned an empty response."

                });

            }


            /* =========================
               SEND REPLY
            ========================= */

            res.json({

                reply: reply

            });

        }


        catch (error) {

            console.error(
                "SERVER ERROR:",
                error
            );


            res.status(500).json({

                error:
                    error.message ||
                    "Internal server error."

            });

        }

    }
);


/* =========================
   START SERVER
========================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Akshu AI server running on port ${PORT}`
        );

    }
);
