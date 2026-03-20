import 'dotenv/config';
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js"; // Sahi path aur small 'f'
import { connectDB } from "./lib/db.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware()); // Auth protection ke liye

// Inngest Endpoint (Public hona chahiye, auth middleware se pehle ya bypass)
app.use("/api/inngest", serve({ client: inngest, functions }));

connectDB();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
