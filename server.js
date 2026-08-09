const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY;


/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(
    express.json({
        limit: "25mb"
    })
);


/* =========================
   PUBLIC FOLDER
========================= */

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/* =========================
   HOME
========================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


/* =========================
   MODELS
========================= */

app.get("/api/models", async (req, res) => {

    try {

        if (!OPENROUTER_API_KEY) {

            return res.status(500).json({
                error:
                    "OPENROUTER_API_KEY is missing on Render."
            });

        }

        const response =
            await fetch(
                "https://openrouter.ai/api/v1/models",
                {
                    headers: {
                        "Authorization":
                            `Bearer ${OPENROUTER_API_KEY}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            return res.status(
                response.status
            ).json({
                error:
                    data.error?.message ||
                    "Could not load models."
            });

        }

        const models =
            Array.isArray(data.data)
                ? data.data
                : [];

        const usableModels =
            models
                .filter(
                    model =>
                        model &&
                        model.id
                )
                .slice(0, 80)
                .map(
                    model => ({
                        id: model.id,
                        name:
                            model.name ||
                            model.id
                    })
                );

        res.json(
            usableModels
        );

    } catch (error) {

        console.error(
            "Models error:",
            error
        );

        res.status(500).json({
            error:
                "Failed to load models."
        });

    }

});


/* =========================
   CHAT
========================= */

app.post("/api/chat", async (req, res) => {

    try {

        if (!OPENROUTER_API_KEY) {

            return res.status(500).json({
                error:
                    "OPENROUTER_API_KEY is missing on Render."
            });

        }

        const {
            message,
            model,
            file,
            fileName,
            fileType
        } = req.body;


        if (
            (!message ||
                !message.trim()) &&
            !file
        ) {

            return res.status(400).json({
                error:
                    "Message or file is required."
            });

        }


        const selectedModel =
            model ||
            "openrouter/free";


        /*
         * NORMAL TEXT MESSAGE
         */

        if (!file) {

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
                                "https://akshu-ai.onrender.com",

                            "X-Title":
                                "Akshu AI"
                        },

                        body: JSON.stringify({

                            model:
                                selectedModel,

                            messages: [
                                {
                                    role: "user",

                                    content:
                                        message ||
                                        ""
                                }
                            ]

                        })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                console.error(
                    "OpenRouter error:",
                    data
                );

                return res.status(
                    response.status
                ).json({

                    error:
                        data.error?.message ||
                        "OpenRouter request failed."

                });

            }


            const reply =
                data.choices?.[0]?.message?.content ||
                "No response received.";

            return res.json({
                reply
            });

        }


        /*
         * FILE CHECK
         */

        if (
            typeof file !== "string" ||
            !file.startsWith("data:")
        ) {

            return res.status(400).json({
                error:
                    "Invalid file data."
            });

        }


        /*
         * IMAGE
         */

        if (
            fileType === "image/png" ||
            fileType === "image/jpeg" ||
            fileType === "image/webp"
        ) {

            const content = [

                {
                    type: "text",

                    text:
                        message ||
                        "Please analyze this image and explain what you see."
                },

                {
                    type: "image_url",

                    image_url: {
                        url: file
                    }

                }

            ];


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
                                "https://akshu-ai.onrender.com",

                            "X-Title":
                                "Akshu AI"
                        },

                        body: JSON.stringify({

                            model:
                                selectedModel,

                            messages: [
                                {
                                    role: "user",
                                    content
                                }
                            ]

                        })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                console.error(
                    "Image OpenRouter error:",
                    data
                );

                return res.status(
                    response.status
                ).json({

                    error:
                        data.error?.message ||
                        "Selected model does not support image input."

                });

            }


            const reply =
                data.choices?.[0]?.message?.content ||
                "I could not analyze the image.";

            return res.json({
                reply
            });

        }


        /*
         * TEXT FILE
         */

        if (fileType === "text/plain") {

            try {

                const base64 =
                    file.split(",")[1];

                const text =
                    Buffer
                        .from(
                            base64,
                            "base64"
                        )
                        .toString("utf8");


                const prompt =

                    (
                        message
                            ? message + "\n\n"
                            : ""
                    ) +

                    "The user attached a text file named " +
                    (fileName || "file.txt") +
                    ". Analyze the file and answer the user's request.\n\n" +

                    "FILE CONTENT:\n" +
                    text;


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
                                    "https://akshu-ai.onrender.com",

                                "X-Title":
                                    "Akshu AI"
                            },

                            body: JSON.stringify({

                                model:
                                    selectedModel,

                                messages: [
                                    {
                                        role: "user",
                                        content: prompt
                                    }
                                ]

                            })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    return res.status(
                        response.status
                    ).json({

                        error:
                            data.error?.message ||
                            "Text file request failed."

                    });

                }


                const reply =
                    data.choices?.[0]?.message?.content ||
                    "I could not read the text file.";

                return res.json({
                    reply
                });

            } catch (fileError) {

                console.error(
                    "Text file error:",
                    fileError
                );

                return res.status(400).json({
                    error:
                        "Could not read the text file."
                });

            }

        }


        /*
         * PDF
         */

        if (fileType === "application/pdf") {

            /*
             * PDF support depends on the selected
             * model/provider. We send it using the
             * OpenRouter file content format.
             */

            const content = [

                {
                    type: "text",

                    text:
                        message ||
                        "Please analyze this PDF and summarize or answer questions about it."
                },

                {
                    type: "file",

                    file: {
                        filename:
                            fileName ||
                            "document.pdf",

                        file_data:
                            file
                    }

                }

            ];


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
                                "https://akshu-ai.onrender.com",

                            "X-Title":
                                "Akshu AI"
                        },

                        body: JSON.stringify({

                            model:
                                selectedModel,

                            messages: [
                                {
                                    role: "user",
                                    content
                                }
                            ]

                        })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                console.error(
                    "PDF OpenRouter error:",
                    data
                );

                return res.status(
                    response.status
                ).json({

                    error:
                        data.error?.message ||
                        "This model/provider cannot read PDF files."

                });

            }


            const reply =
                data.choices?.[0]?.message?.content ||
                "I could not analyze the PDF.";

            return res.json({
                reply
            });

        }


        /*
         * UNSUPPORTED FILE
         */

        return res.status(400).json({

            error:
                "This file type is not supported. Please use PNG, JPG, WEBP, PDF, or TXT."

        });


    } catch (error) {

        console.error(
            "Chat server error:",
            error
        );

        res.status(500).json({

            error:
                error.message ||
                "Server error."

        });

    }

});


/* =========================
   START SERVER
========================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Akshu AI running on port ${PORT}`
        );

    }
);
