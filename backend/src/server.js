import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js"; 
import { connectDB } from "./lib/db.js";
import { ENV } from './lib/env.js';

const app = express();
app.use(cors());
app.use(express.json());

// Inngest route
app.use("/api/inngest", serve({ client: inngest, functions }));
app.post("/api/webhook/clerk", async (req, res) => {
    try {
        const payload = req.body;
        const eventType = payload.type; // user.created ya user.deleted

        console.log("Clerk Webhook Received:", eventType);

        await inngest.send({   
            name: eventType, // user.created or user.deleted
            data: payload.data
        });
        
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Webhook Error:", err);
        return res.status(500).json({ error: "Webhook failed" });
    }
});

app.use("/health",(req,res)=>{
res.json({message:"hay bro I am health"})
})
const startServer = async () => {
  try {
    await connectDB();
    app.listen(ENV.port, () => console.log(`🚀 Server on port ${ENV.port}`));
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();
export default app;