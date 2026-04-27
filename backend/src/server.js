import express from "express";
import cors from "cors";
import { createServer } from "http";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { clerkMiddleware } from '@clerk/express'
import { protectRoute } from "./middleware/protectRoutes.js";
import { chatRoutes} from "./routes/chatRoute.js"
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import executeRoutes from "./routes/execute.js";
import { problemRoutes } from "./routes/problemRoutes.js";
import { communityRoutes } from "./routes/communityRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import { initializeSocket, setIOInstance } from "./lib/socket.js";

const app = express();
// 🛡️ Senior Dev: Create HTTP server for Socket.io
const httpServer = createServer(app);
const io = initializeSocket(httpServer);
setIOInstance(io);

// Build allowed origins at request-time so Vercel env vars are always fresh
function getAllowedOrigins() {
  const base = ['http://localhost:5173', 'http://localhost:3000'];
  // Read directly from process.env — ENV object is a snapshot and may miss Vercel vars
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) return base;
  const extra = clientUrl.split(',').map(o => o.trim()).filter(Boolean);
  return [...new Set([...base, ...extra])];
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow no-origin requests (Postman, curl, server-to-server, Inngest)
      if (!origin) return callback(null, true);
      const allowed = getAllowedOrigins();
      if (allowed.includes(origin)) return callback(null, origin);
      console.warn(`⚠️ CORS blocked: ${origin}`);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-clerk-auth'],
    optionsSuccessStatus: 200,
  })
);

// Explicit OPTIONS preflight handler for Express 5 (wildcard syntax changed)
app.options(/.*/, cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) return callback(null, origin);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-clerk-auth'],
  optionsSuccessStatus: 200,
}));
app.use(express.json());
app.use(clerkMiddleware())//this add auth field to request object : req.auth()

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

app.use("/api/chat",chatRoutes)
app.use("/api/sessions",sessionRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api/execute", executeRoutes)
app.use("/api/community", communityRoutes);
app.use("/api/problems", problemRoutes)
app.use("/api/submissions", submissionRoutes);

app.get("/health", (req, res) => {
  res.json({
    message: "🚀 Server is healthy",
  });
});

// app.get("/book", (req, res) => {
//   res.json({
//     message: "This is the book endpoint",
//   });
// });

// app.get("/video-calls",protectRoute,(req,res)=>{
// res.json({message:"video call endpoint"})
// })
app.post("/api/webhook/clerk", async (req, res) => {
  try {
    const payload = req.body;
    const eventType = payload.type;

    console.log("📩 Clerk webhook:", eventType);

    await inngest.send({
      name: eventType,
      data: payload.data,
    });

    return res.status(200).json({
      success: true,
      message: "Webhook received",
    });
  } catch (err) {
    console.error("❌ Webhook error:", err);

    return res.status(500).json({
      error: "Webhook failed",
    });
  }
});

// Global error handler — re-apply CORS headers so errors don't strip them
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  console.error('❌ Global error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server (dev only — Vercel handles its own lifecycle in production)
if (process.env.NODE_ENV !== "production") {
  connectDB()
    .then(() => {
      httpServer.listen(ENV.port, () => {
        console.log(`🚀 Server running on port ${ENV.port}`);
        console.log(`🔌 Socket.io ready for WebSocket connections`);
      });
    })
    .catch((err) => {
      console.error("❌ Failed to start server:", err);
    });
} else {
  // Serverless cold-start: connect DB once per instance
  connectDB().catch((err) => {
    console.error("❌ Database connection failed:", err);
  });
}

export default app;
