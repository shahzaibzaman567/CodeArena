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


function normalizeOrigin(u) {
  return (u || "").trim().replace(/\/$/, "");
}

function getAllowedOrigins() {
  const base = [
    "http://localhost:5173",
    "http://localhost:3000",
  ];

  const client = process.env.CLIENT_URL
    ? [normalizeOrigin(process.env.CLIENT_URL)]
    : [];

  return [...new Set([...base, ...client])];
}
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = getAllowedOrigins();
    const incoming = normalizeOrigin(origin);
    if (allowed.includes(incoming)) return callback(null, true);
    console.warn(`[CORS] Blocked: ${incoming}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// Clerk middleware sirf /api routes pe — poore app pe lagane se
// Clerk handshake loop hota hai jab / pe koi route nahi hota
app.use("/api", clerkMiddleware());

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

// DB middleware sirf /api routes pe
app.use("/api", async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error("[DB] ❌", err.message);
    res.status(503).json({ message: "DB not available" });
  }
});

/* ---------------------------
   ROUTES
--------------------------- */
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);

app.get("/health", (req, res) => res.json({ message: "Server OK" }));

// Root route — Clerk handshake loop rokne ke liye 200 return karo
app.get("/", (req, res) => res.json({ message: "CodeArena API" }));

/* ---------------------------
   ERROR HANDLER
--------------------------- */
app.use((err, req, res, next) => {
  console.error(`[ERROR HANDLER] ${req.method} ${req.url} - Error:`, err.message);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

/* ---------------------------
   SERVER INITIALIZATION
   Modified for deployment: Starts if not on Vercel OR if in DEV.
--------------------------- */
const isServerless = !!process.env.VERCEL;

if (!isServerless) {
  const PORT = process.env.PORT || 4000;
  const { createServer } = await import("http");
  const { initializeSocket, setIOInstance } = await import("./lib/socket.js");

  const httpServer = createServer(app);
  const io = initializeSocket(httpServer);
  setIOInstance(io);

  // In standard container/VPS, we want to connect DB on startup
  try {
    await ensureDB();
  } catch (err) {
    console.error("Critical: Initial DB connection failed");
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (process.env.NODE_ENV === "production") {
      console.log("MODE: Production (Long-lived)");
    } else {
      console.log("MODE: Development");
      console.log("Socket.io ready (DEV mode)");
    }
  });
}

export default app;