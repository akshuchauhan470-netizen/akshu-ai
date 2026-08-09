const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(
    express.json({
        limit: "15mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "15mb"
    })
);

// ===============================
// FRONTEND
// ===============================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        message: "Akshu AI server is running"
    });
});

// ===============================
// MODELS
// ===============================

app.get("/api/models", async (req, res) => {

    try {

        const response = await fetch(
            "https://openrouter.ai/api/v1/models"
        );

        if (!response.ok) {
            throw new Error(
                `OpenRouter models error: ${response.status}`
            );
        }

        const data = await response.json();

        const models = Array.isArray(data.data)
            ? data.data
            : [];

        // Text + vision models
        const usefulModels = models
            .filter(model => {

                const modalities =
                    model.architecture?.input_modalities ||
                    [];

                return modalities.includes("text");

            })
            .map(model => {

                const modalities =
                    model.architecture?.input_modalities ||
                    [];

                const hasImage =
                    modalities.includes("image");

                return {
                    id: model.id,
                    name:
                        model.name ||
                        model.id,
                    supportsImage:
                        hasImage
                };

            })
            .sort((a, b) => {

                // Vision models first
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

        res.json(usefulModels);

    } catch (error) {

        console.error(
            "Models error:",
            error
        );

        res.status(500).json({
            error: "Could not load models"
        });

    }

});

// ===============================
// CHAT
// ===============================

app.post("/api/chat", async (req, res) => {

    try {

        if (!OPENROUTER_API_KEY) {

            return res.status(500).json({
                error:
                    "OPENROUTER_API_KEY is missing in Render Environment Variables."
            });

        }

        const {
            message,
            model,
            image,
            imageData,
            fileName,
            fileType
        } = req.body || {};

        const userMessage =
            typeof message === "string"
                ? message.trim()
                : "";

        // --------------------------------
        // IMAGE DATA
        // --------------------------------

        let imageUrl = null;

        if (image) {
            imageUrl = image;
        }

        if (
            !imageUrl &&
            imageData
        ) {
            imageUrl = imageData;
        }

        // --------------------------------
        // DEFAULT TEXT MODEL
        // --------------------------------

        let selectedModel =
            model ||
            "openrouter/free";

        // --------------------------------
        // IMAGE MODEL
        // --------------------------------
        //
        // Gemma 4 31B is a free multimodal
        // model on OpenRouter and accepts
        // text + image input.
        //
        // --------------------------------

        if (imageUrl) {

            selectedModel =
                "google/gemma-4-31b-it:free";

            console.log(
                "Image detected."
            );

            console.log(
                "Using vision model:",
                selectedModel
            );

        }

        // --------------------------------
        // BUILD MESSAGE
        // --------------------------------

        let content = [];

        if (userMessage) {

            content.push({
                type: "text",
                text: userMessage
            });

        } else {

            content.push({
                type: "text",
                text:
                    "Please analyze the uploaded file and tell me what it contains."
            });

        }

        // --------------------------------
        // IMAGE
        // --------------------------------

        if (imageUrl) {

            let finalImageUrl =
                imageUrl;

            // If frontend sends raw base64,
            // convert it into a data URL.
            if (
                !finalImageUrl.startsWith(
                    "data:"
                ) &&
                fileType &&
                fileType.startsWith(
                    "image/"
                )
            ) {

                finalImageUrl =
                    `data:${fileType};base64,${finalImageUrl}`;

            }

            content.push({

                type: "image_url",

                image_url: {
                    url:
                        finalImageUrl
                }

            });

        }

        // --------------------------------
        // OPENROUTER REQUEST
        // --------------------------------

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
            "Sending request to OpenRouter:"
        );

        console.log({
            model: selectedModel,
            hasImage: Boolean(imageUrl),
            fileName:
                fileName || null
        });

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {

                method: "POST",

                headers: {

                    "Authorization":
                        `Bearer ${OPENROUTER_API_KEY}`,

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

        const data =
            await response.json();

        // --------------------------------
        // OPENROUTER ERROR
        // --------------------------------

        if (!response.ok) {

            console.error(
                "OpenRouter error:",
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

            let errorMessage =
                "AI request failed.";

            if (
                data?.error?.message
            ) {

                errorMessage =
                    data.error.message;

            }

            return res.status(
                response.status
            ).json({

                error:
                    errorMessage,

                details:
                    data?.error || data

            });

        }

        // --------------------------------
        // GET REPLY
        // --------------------------------

        let reply =
            data?.choices?.[0]?.message
                ?.content;

        // Some providers can return
        // structured content.
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
                "No response received from AI.";

        }

        // --------------------------------
        // SUCCESS
        // --------------------------------

        res.json({

            success: true,

            reply: reply.trim(),

            model:
                data.model ||
                selectedModel,

            file:
                imageUrl
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
            "Chat server error:",
            error
        );

        res.status(500).json({

            error:
                error.message ||
                "Internal server error."

        });

    }

});

// ===============================
// 404
// ===============================

app.use(
    (req, res) => {

        res.status(404).json({
            error:
                "API route not found"
        });

    }
);

// ===============================
// START SERVER
// ===============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Akshu AI running on port ${PORT}`
        );

    }
);
