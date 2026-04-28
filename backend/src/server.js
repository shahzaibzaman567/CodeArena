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

/* ─────────────────────────────
   CORS FIX (IMPORTANT)
──────────────────────────── */
function getAllowedOrigins() {
  return [
    "http://localhost:5173",
    "http://localhost:3000",
    ...(process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
      : []),
  ];
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ CORS blocked:", origin);
    return callback(null, false);
  },
  credentials: true,
};

/* IMPORTANT: apply cors properly */
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(clerkMiddleware());

/* ─────────────────────────────
   DB CONNECT (SAFE FOR VERCEL)
──────────────────────────── */
let isConnected = false;

async function ensureDB() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
}

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.log("DB Error:", err.message);
    res.status(503).json({ message: "DB not available" });
  }
});

/* ─────────────────────────────
   ROUTES
──────────────────────────── */
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);

/* ─────────────────────────────
   HEALTH CHECK
──────────────────────────── */
app.get("/health", (req, res) => {
  res.json({ message: "Server OK 🚀" });
});

/* ─────────────────────────────
   ERROR HANDLER
──────────────────────────── */
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({
    error: err.message || "Internal Server Error",
  });
});

/* ─────────────────────────────
   VERCEL EXPORT ONLY (NO LISTEN)
──────────────────────────── */
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  const { createServer } = await import("http");
  const { initializeSocket, setIOInstance } = await import("./lib/socket.js");
  const httpServer = createServer(app);
  const io = initializeSocket(httpServer);
  setIOInstance(io);
  await ensureDB();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔌 Socket.io ready`);
  });
}

export default app;