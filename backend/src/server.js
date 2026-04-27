import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { clerkMiddleware } from "@clerk/express";
import { chatRoutes } from "./routes/chatRoute.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import executeRoutes from "./routes/execute.js";
import { problemRoutes } from "./routes/problemRoutes.js";
import { communityRoutes } from "./routes/communityRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";

// Socket.io is only used in local dev (Vercel serverless does not support
// persistent WebSocket servers). Import lazily so it never crashes production.
let _socketInitialized = false;
async function initSocketForDev(httpServer) {
  if (_socketInitialized) return;
  _socketInitialized = true;
  const { initializeSocket, setIOInstance } = await import("./lib/socket.js");
  const io = initializeSocket(httpServer);
  setIOInstance(io);
}

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
function getAllowedOrigins() {
  const base = [
    "http://localhost:5173",
    "http://localhost:3000",
    // Production frontend URLs
    "https://code-arena-6fjiq10iq-shahzaibzaman465s-projects.vercel.app",
  ];
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) return base;
  const extra = clientUrl.split(",").map((o) => o.trim()).filter(Boolean);
  return [...new Set([...base, ...extra])];
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) return callback(null, origin);
    console.warn(`⚠️ CORS blocked: ${origin}`);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-clerk-auth"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// Express 5 requires regex for wildcard OPTIONS
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(clerkMiddleware());

// ── DB middleware — ensures connection before every request ───────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    res.status(503).json({ message: "Database unavailable. Please try again." });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);

app.get("/health", (req, res) => {
  res.json({ message: "🚀 Server is healthy" });
});

app.post("/api/webhook/clerk", async (req, res) => {
  try {
    const payload = req.body;
    const eventType = payload.type;
    console.log("📩 Clerk webhook:", eventType);
    await inngest.send({ name: eventType, data: payload.data });
    return res.status(200).json({ success: true, message: "Webhook received" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).json({ error: "Webhook failed" });
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  console.error("❌ Global error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ── Local dev server ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const { createServer } = await import("http");
  const httpServer = createServer(app);
  await initSocketForDev(httpServer);
  connectDB()
    .then(() => {
      httpServer.listen(ENV.port, () => {
        console.log(`🚀 Server running on port ${ENV.port}`);
        console.log(`🔌 Socket.io ready`);
      });
    })
    .catch((err) => console.error("❌ Failed to start server:", err));
}

export default app;
