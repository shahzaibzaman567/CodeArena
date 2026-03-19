import express from "express";
import dotenv from "dotenv";
import { ENV } from "./lib/env.js";
import path from "path";
import { connectDB } from "./lib/db.js";
import cors from "cors"
import { serve } from "inngest/express";
import { inngest } from "./lib/inngest.js"; // Yahan same name 'inngest'
import { functions } from "./lib/inngest.js";
dotenv.config();

const app = express();
const __dirname = path.resolve();

// Middleware
app.use(express.json());
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));

// Inngest serve
app.use("/api/inngest", serve({ client: inngest, functions }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ message: "API is up and running" });
});

// Books endpoint
app.get("/books", (req, res) => {
  res.status(200).json({ message: "This is the books endpoint" });
});

// Connect DB
connectDB();

// Start server
// app.listen(ENV.port, () => {
//   console.log(`Server started on port ${ENV.port}`);
// });

export default app;