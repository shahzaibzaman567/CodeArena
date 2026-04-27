import dotenv from "dotenv";
dotenv.config({ quiet: true }); // load .env file

export let ENV = {
    port: process.env.PORT,
    DB_URL: process.env.DB_URL,
    NODE_ENV: process.env.NODE_ENV,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    STREAM_API_KEY: process.env.STREAM_API_KEY,
    STREAM_API_SECRET: process.env.STREAM_API_SECRET,
    CLIENT_URL: process.env.CLIENT_URL?.replace(/\/$/, ""),
    // Feature 2: AI Code Helper
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

// console.log("PORT:", ENV.DB_URL);
