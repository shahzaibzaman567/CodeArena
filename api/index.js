import express from "express";
import http from "http";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { connectDB } from "./lib/db.js";
import { initializeSocket, setIOInstance } from "./lib/socket.js";
import { clerkMiddleware } from "@clerk/express";
import { ENV } from "./lib/env.js";

import { chatRoutes } from "./routes/chatRoute.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import executeRoutes from "./routes/execute.js";
import { problemRoutes } from "./routes/problemRoutes.js";
import { communityRoutes } from "./routes/communityRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { notificationRoutes } from "./routes/notificationRoutes.js";
import { bookRoutes } from "./routes/bookRoutes.js";

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
    // 1. Allow internal requests (no origin)
    if (!origin) return callback(null, true);

    const normalized = origin.trim().replace(/\/$/, "");

    // 2. Allow explicitly listed origins
    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }

    // 3. 🛡️ Senior Dev: Allow Vercel preview/deployment URLs dynamically
    if (normalized.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    // 4. Log and block others
    console.warn(`[CORS REJECTED]: ${origin}`);
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

// Clerk auth for API routes (Bearer session tokens from the SPA)
app.use(
  "/api",
  clerkMiddleware({
    secretKey: ENV.CLERK_SECRET_KEY,
    publishableKey: ENV.CLERK_PUBLISHABLE_KEY,
  })
);

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
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/books", bookRoutes);

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

// Start server locally
if (process.env.NODE_ENV !== "production") {
  const requestedPort = Number(process.env.PORT) || 4000;
  const allowPortFallback = !process.env.PORT;
  let httpServer;
  let shuttingDown = false;

  const shutdown = (signal, callback) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`
[shutdown] Received ${signal}. Closing server...`);

    if (httpServer && httpServer.listening) {
      httpServer.close((err) => {
        if (err) {
          console.error("[shutdown] Error closing HTTP server:", err);
        } else {
          console.log("[shutdown] HTTP server closed.");
        }
        if (typeof callback === "function") {
          callback();
        } else {
          process.exit(err ? 1 : 0);
        }
      });
    } else {
      if (typeof callback === "function") {
        callback();
      } else {
        process.exit(0);
      }
    }
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGUSR2", () => shutdown("SIGUSR2", () => process.kill(process.pid, "SIGUSR2")));

  const startServerOnPort = (port, attemptsLeft = 6) => {
    if (attemptsLeft <= 0) {
      console.error("[server] Exhausted port retries. Aborting.");
      process.exit(1);
    }

    httpServer = http.createServer(app);
    const io = initializeSocket(httpServer);
    setIOInstance(io);

    httpServer.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        if (!allowPortFallback) {
          console.error(`\n[server] Port ${port} is already in use and PORT was explicitly configured. Aborting.`);
          process.exit(1);
        }

        console.warn(`\n[server] Port ${port} in use. Trying port ${port + 1} (retries left: ${attemptsLeft - 1})`);
        // Small delay before retrying
        setTimeout(() => startServerOnPort(port + 1, attemptsLeft - 1), 200);
        return;
      }
      console.error("[server] Unexpected server error:", err);
      process.exit(1);
    });

    httpServer.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  };

  startServerOnPort(requestedPort);
}
