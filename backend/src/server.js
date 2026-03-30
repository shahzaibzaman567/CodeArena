import 'dotenv/config';
import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js"; 
import { connectDB } from "./lib/db.js";

const app = express();
app.use(cors());
app.use(express.json());

// Inngest route
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/health",(req,res)=>{
res.json({message:"hay bro I am health"})
})
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

startServer();