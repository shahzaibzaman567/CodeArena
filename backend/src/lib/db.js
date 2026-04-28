import mongoose from "mongoose";
import { ENV } from "./env.js";

// Cache the connection across serverless invocations
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export const connectDB = async () => {
  // Already connected — reuse
  if (cached.conn) return cached.conn;

  if (!ENV.DB_URL) {
    throw new Error("DB_URL is not defined in environment variables");
  }

  // Connection in progress — wait for it
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(ENV.DB_URL, { dbName: "codearena" })
      .then((m) => {
        console.log("✅ Connected to MongoDB:", m.connection.host);
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next invocation
    
    if (err.message.includes("timed out") || err.name === "MongoNetworkTimeoutError") {
      console.error("\n❌ MongoDB Connection Timeout!");
      console.error("👉 Check if your IP address is whitelisted in MongoDB Atlas (Network Access).");
      console.error("👉 Check if your DB_URL is correct.\n");
    } else {
      console.error("DB connection error:", err.message);
    }
    throw err;
  }

  return cached.conn;
};
