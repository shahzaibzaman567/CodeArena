import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { connectDB } from "./lib/db.js";
import { clerkMiddleware } from "@clerk/express";

import { chatRoutes } from "./routes/chatRoute.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import executeRoutes from "./routes/execute.js";
import { problemRoutes } from "./routes/problemRoutes.js";
import { communityRoutes } from "./routes/communityRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";

const app = express();

// 🛡️ Senior Dev: Optimized CORS for Serverless
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://code-arena-lake.vercel.app",
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.trim().replace(/\/$/, ""));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());

// 🛡️ Senior Dev: Database connection middleware with singleton check
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[DB Connection Error]", err.message);
    res.status(503).json({ error: "Service Unavailable: Database Connection Failed" });
  }
});

// 🛡️ Senior Dev: Clerk Middleware (Scoped to API)
app.use("/api", clerkMiddleware());

/* ---------------------------
   SERVERLESS ROUTES
--------------------------- */
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);

// Health Checks
app.get("/health", (req, res) => res.status(200).json({ status: "healthy" }));
app.get("/", (req, res) => res.status(200).json({ message: "CodeArena Serverless API" }));

/* ---------------------------
   ERROR HANDLING
--------------------------- */
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
  res.status(status).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// 🛡️ Senior Dev: Export for Vercel Serverless
export default app;