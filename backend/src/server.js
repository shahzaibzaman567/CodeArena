import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

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

app.get("/health", (req, res) => {
  res.json({
    message: "🚀 Server is healthy",
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(ENV.port, () => {
      console.log(`🚀 Server running on port ${ENV.port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
};

startServer();

export default app;