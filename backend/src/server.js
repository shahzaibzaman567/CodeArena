import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js"; 
import { connectDB } from "./lib/db.js";
import { ENV } from './lib/env.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: ENV.NODE_ENV 
  });
});

// Inngest webhook endpoint (must be before other routes)
app.use("/api/inngest", serve({ 
  client: inngest, 
  functions,
}));

// Clerk webhook endpoint
app.post("/api/webhook/clerk", async (req, res) => {
  try {
    const payload = req.body;
    const eventType = payload.type; // e.g., "user.created", "user.deleted"

    console.log("🔔 Clerk webhook received:", { 
      eventType, 
      userId: payload.data?.id 
    });

    // Validate event type before sending to Inngest
    if (!["user.created", "user.deleted"].includes(eventType)) {
      console.warn("⚠️ Unhandled Clerk event type:", eventType);
      return res.status(200).json({ success: true, skipped: true });
    }

    // Send event to Inngest for async processing [[37]]
    await inngest.send({   
      name: eventType,
      data: payload.data,
      // Add metadata for debugging
      ts: Date.now(),
    });
    
    // Respond immediately to Clerk (they expect 200 within 5s)
    return res.status(200).json({ 
      success: true, 
      eventId: eventType,
      received: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Clerk webhook processing failed:", {
      error: err.message,
      body: req.body?.type,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    
    // Return 500 to trigger Clerk retry (they retry 5xx errors)
    return res.status(500).json({ 
      error: "Webhook processing failed",
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(ENV.port, () => {
      console.log(`🚀 Server running on port ${ENV.port}`);
      console.log(`📡 Inngest endpoint: /api/inngest`);
      console.log(`🔗 Clerk webhook: /api/webhook/clerk`);
    });
    
  } catch (error) {
    console.error("💥 Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await chatClient?.disconnectUser?.(); // Cleanup Stream client if needed
  process.exit(0);
});

startServer();

export default app;