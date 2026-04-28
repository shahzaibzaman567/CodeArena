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

/* ---------------------------
   CORS (PRODUCTION SAFE)
--------------------------- */
function normalizeOrigin(u) {
  return (u || "").trim().replace(/\/$/, "");
}

function getAllowedOrigins() {
  const base = ["http://localhost:5173", "http://localhost:3000"];
  const extra = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map(normalizeOrigin).filter(Boolean)
    : [];
  return [...new Set([...base, ...extra])];
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = getAllowedOrigins();
    const incoming = normalizeOrigin(origin);
    console.log(`[CORS] Origin: ${incoming}, Allowed: ${allowed.join(', ')}`);
    if (allowed.includes(incoming)) {
      console.log(`[CORS] ✅ Allowed: ${incoming}`);
      return callback(null, true);
    }
    console.log(`[CORS] ❌ Blocked: ${incoming}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(clerkMiddleware());

/* ---------------------------
   DB CONNECT (SERVERLESS SAFE)
--------------------------- */
let isConnected = false;
async function ensureDB() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
}

app.use(async (req, res, next) => {
  console.log('[DB MIDDLEWARE] Ensuring connection...');
  try {
    await ensureDB();
    console.log('[DB MIDDLEWARE] ✅ Connected');
    next();
  } catch (err) {
    console.error("[DB MIDDLEWARE] ❌ Error:", err.message);
    res.status(503).json({ message: "DB not available" });
  }
});

/* ---------------------------
   ROUTES
--------------------------- */
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", (req, res, next) => {
  console.log(`[SESSION ROUTE] ${req.method} ${req.url}`);
  next();
}, sessionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);

app.get("/health", (req, res) => res.json({ message: "Server OK" }));

/* ---------------------------
   ERROR HANDLER
--------------------------- */
app.use((err, req, res, next) => {
  console.error(`[ERROR HANDLER] ${req.method} ${req.url} - Error:`, err.message);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

/* ---------------------------
   LOCAL DEV ONLY LISTEN
   IMPORTANT: Vercel serverless does not keep websocket servers alive.
--------------------------- */
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  const { createServer } = await import("http");
  const { initializeSocket, setIOInstance } = await import("./lib/socket.js");

  const httpServer = createServer(app);
  const io = initializeSocket(httpServer);
  setIOInstance(io);

  await ensureDB();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Socket.io ready (DEV only)");
  });
}

export default app;