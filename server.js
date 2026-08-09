const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.OPENROUTER_API_KEY;

const OPENROUTER_URL =
    "https://openrouter.ai/api/v1/chat/completions";

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());

app.use(
    express.json({
        limit: "20mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "20mb"
    })
);

// ==========================================
// FRONTEND
// ==========================================

const publicPath = path.join(
    __dirname,
    "public"
);

app.use(
    express.static(publicPath)
);

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            publicPath,
            "index.html"
        )
    );

});

// ==========================================
// HEALTH
// ==========================================

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "Akshu AI server is running"
    });

});

// ==========================================
// LOAD MODELS
// ==========================================

app.get("/api/models", async (req, res) => {

    try {

        const response = await fetch(
            "https://openrouter.ai/api/v1/models"
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
            Array.isArray(data.data)
                ? data.data
                : [];

        const result =
            models
                .filter(model => {

                    const input =
                        model.architecture
                            ?.input_modalities || [];

                    return input.includes("text");

                })
                .map(model => {

                    const input =
                        model.architecture
                            ?.input_modalities || [];

                    return {

                        id: model.id,

                        name:
                            model.name ||
                            model.id,

                        supportsImage:
                            input.includes(
                                "image"
                            )

                    };

                })
                .sort((a, b) => {

                    if (
                        a.supportsImage &&
                        !b.supportsImage
                    ) {
                        return -1;
                    }

                    if (
                        !a.supportsImage &&
                        b.supportsImage
                    ) {
                        return 1;
                    }

                    return a.name.localeCompare(
                        b.name
                    );

                });

        // Always keep free router available
        result.unshift({
            id: "openrouter/free",
            name: "Free AI",
            supportsImage: true
        });

        // Remove duplicate model IDs
        const unique =
            result.filter(
                (model, index, array) =>
                    index ===
                    array.findIndex(
                        item =>
                            item.id ===
                            model.id
                    )
            );

        res.json(unique);

    } catch (error) {

        console.error(
            "MODEL ERROR:",
            error
        );

        res.status(500).json({
            error:
                "Could not load AI models"
        });

    }

});

// ==========================================
// CHAT
// ==========================================

app.post("/api/chat", async (req, res) => {

    try {

        // ----------------------------------
        // API KEY CHECK
        // ----------------------------------

        if (!API_KEY) {

            return res.status(500).json({

                error:
                    "OPENROUTER_API_KEY is missing in Render Environment Variables."

            });

        }

        // ----------------------------------
        // REQUEST DATA
        // ----------------------------------

        const {
            message,
            model,
            image,
            imageData,
            fileName,
            fileType
        } = req.body || {};

        const text =
            typeof message === "string"
                ? message.trim()
                : "";

        // ----------------------------------
        // FIND IMAGE
        // ----------------------------------

        let imageValue =
            image ||
            imageData ||
            null;

        // ----------------------------------
        // MODEL
        // ----------------------------------

        let selectedModel =
            model ||
            "openrouter/free";

        /*
         * IMPORTANT:
         *
         * If an image is attached, ALWAYS
         * use openrouter/free.
         *
         * OpenRouter's free router can select
         * a free model supporting image input.
         */

        if (imageValue) {

            selectedModel =
                "openrouter/free";

            console.log(
                "IMAGE REQUEST"
            );

            console.log(
                "Using model:",
                selectedModel
            );

        }

        // ----------------------------------
        // MESSAGE CONTENT
        // ----------------------------------

        const content = [];

        // Text part

        content.push({

            type: "text",

            text:
                text ||
                (
                    imageValue
                        ? "Please analyze this image and tell me what you see."
                        : "Hello"
                )

        });

        // ----------------------------------
        // IMAGE PART
        // ----------------------------------

        if (imageValue) {

            let finalImage =
                String(imageValue);

            /*
             * If frontend sends ONLY base64,
             * convert it to a data URL.
             */

            if (
                !finalImage.startsWith(
                    "data:"
                ) &&
                fileType &&
                String(fileType)
                    .startsWith("image/")
            ) {

                finalImage =
                    `data:${fileType};base64,${finalImage}`;

            }

            /*
             * OpenRouter expects:
             *
             * {
             *   type: "image_url",
             *   image_url: {
             *      url: "..."
             *   }
             * }
             */

            content.push({

                type: "image_url",

                image_url: {

                    url: finalImage

                }

            });

        }

        // ----------------------------------
        // REQUEST BODY
        // ----------------------------------

        const requestBody = {

            model: selectedModel,

            messages: [

                {

                    role: "user",

                    content: content

                }

            ],

            temperature: 0.7,

            max_tokens: 2000

        };

        console.log(
            "Sending to OpenRouter..."
        );

        console.log({
            model: selectedModel,
            hasImage:
                Boolean(imageValue),
            fileName:
                fileName || null,
            fileType:
                fileType || null
        });

        // ----------------------------------
        // OPENROUTER REQUEST
        // ----------------------------------

        const response =
            await fetch(
                OPENROUTER_URL,
                {

                    method: "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${API_KEY}`,

                        "Content-Type":
                            "application/json",

                        "HTTP-Referer":
                            "https://akshu-ai.onrender.com",

                        "X-Title":
                            "Akshu AI"

                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )

                }
            );

        // ----------------------------------
        // RESPONSE
        // ----------------------------------

        const data =
            await response.json();

        // ----------------------------------
        // ERROR
        // ----------------------------------

        if (!response.ok) {

            console.error(
                "OPENROUTER ERROR:"
            );

            console.error(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

            return res.status(
                response.status
            ).json({

                error:
                    data?.error?.message ||
                    "Provider returned error",

                details:
                    data?.error || null

            });

        }

        // ----------------------------------
        // GET AI REPLY
        // ----------------------------------

        let reply =
            data?.choices?.[0]
                ?.message
                ?.content;

        // Some responses can be arrays

        if (
            Array.isArray(reply)
        ) {

            reply =
                reply
                    .map(item => {

                        if (
                            typeof item ===
                            "string"
                        ) {
                            return item;
                        }

                        return (
                            item?.text ||
                            ""
                        );

                    })
                    .join("");

        }

        if (
            typeof reply !==
            "string"
        ) {

            reply =
                "AI did not return a response.";

        }

        reply =
            reply.trim();

        // ----------------------------------
        // SUCCESS
        // ----------------------------------

        console.log(
            "AI RESPONSE SUCCESS"
        );

        res.json({

            success: true,

            reply: reply,

            model:
                data?.model ||
                selectedModel,

            file:
                imageValue
                    ? {

                        name:
                            fileName ||
                            null,

                        type:
                            fileType ||
                            null

                    }
                    : null

        });

    } catch (error) {

        console.error(
            "SERVER ERROR:"
        );

        console.error(
            error
        );

        res.status(500).json({

            error:
                error?.message ||
                "Internal server error"

        });

    }

});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {

    res.status(404).json({

        error:
            "Route not found"

    });

});

// ==========================================
// START
// ==========================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Akshu AI running on port ${PORT}`
        );

    }
);
