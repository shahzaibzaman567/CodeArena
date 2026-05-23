import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
}

const normalizeEnv = (value) => typeof value === "string" ? value.trim() : undefined;

export let ENV = {
    port: normalizeEnv(process.env.PORT),
    DB_URL: normalizeEnv(process.env.DB_URL),
    NODE_ENV: normalizeEnv(process.env.NODE_ENV),
    INNGEST_EVENT_KEY: normalizeEnv(process.env.INNGEST_EVENT_KEY),
    INNGEST_SIGNING_KEY: normalizeEnv(process.env.INNGEST_SIGNING_KEY),
    STREAM_API_KEY: normalizeEnv(process.env.STREAM_API_KEY),
    STREAM_API_SECRET: normalizeEnv(process.env.STREAM_API_SECRET),
    CLIENT_URL: normalizeEnv(process.env.CLIENT_URL)?.replace(/\/$/, ""),
    ADMIN_EMAIL: normalizeEnv(process.env.ADMIN_EMAIL)?.toLowerCase() || "shahzaibzaman465@gmail.com",
    // Feature 2: AI Code Helper
    CLAUDE_API_KEY: normalizeEnv(process.env.CLAUDE_API_KEY),
    GEMINI_API_KEY: normalizeEnv(process.env.GEMINI_API_KEY),
    EMAIL_USER: normalizeEnv(process.env.EMAIL_USER),
    EMAIL_PASS: normalizeEnv(process.env.EMAIL_PASS),
    CLERK_SECRET_KEY: normalizeEnv(process.env.CLERK_SECRET_KEY),
    CLERK_PUBLISHABLE_KEY: normalizeEnv(process.env.CLERK_PUBLISHABLE_KEY),
};

// console.log("PORT:", ENV.DB_URL);
