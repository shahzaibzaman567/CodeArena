import {StreamChat} from "stream-chat"
import { ENV } from "./env.js"
const apiKey=ENV.STREAM_API_KEY
const apiSecret=ENV.STREAM_API_SECRET

if (!apiKey || !apiSecret) {
  throw new Error("STREAM_API_KEY or STREAM_API_SECRET is missing in env variables");
}
export const chatClient = StreamChat.getInstance(apiKey, apiSecret, {
  disableCache: true, // ✅ Important for server-side usage
  timeout: 10000,
});
// ✅ Fixed version
export const upsertStreamUser = async(userData) => {
  try {
    const result = await chatClient.upsertUser(userData);
    console.log("✅ Stream User upserted:", userData.id);
    return result;
  } catch (err) {
    console.error("❌ Stream upsertUser failed:", {
      error: err.message,
      userData: { id: userData.id } // Avoid logging sensitive data
    });
    throw err; // 🔥 Critical: Re-throw so Inngest retries
  }
};

export const deleteStreamUser = async(userId) => {
  try {
    // Stream's deleteUser expects a string ID, not an object
    await chatClient.deleteUser(userId.toString());
    console.log("✅ Stream User deleted:", userId);
    return { success: true };
  } catch (err) {
    console.error("❌ Stream deleteUser failed:", {
      error: err.message,
      userId
    });
    throw err; // 🔥 Re-throw for Inngest retry
  }
};

