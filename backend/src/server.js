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
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = ENV.CLIENT_URL
        ? ENV.CLIENT_URL.split(',')
        : [
            'http://localhost:5173',
            'https://code-arena-oyjebv1j0-shahzaibzaman465s-projects.vercel.app'
          ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // 🔥 TEMP FIX (prevents Vercel blocking)
      }
    },
    credentials: true,
  })
);
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

const startServer = async () => {
  try {
    await connectDB();

    // 🛡️ Senior Dev: Listen on httpServer instead of app for Socket.io
    httpServer.listen(ENV.port, () => {
      console.log(`🚀 Server running on port ${ENV.port}`);
      console.log(`🔌 Socket.io ready for WebSocket connections`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
};

startServer();

export default app;
