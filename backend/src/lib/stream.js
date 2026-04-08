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
export const upsertStreamUser = async (userData) => {
  try {
    console.log("📤 Sending to Stream:", userData);

    const result = await chatClient.upsertUser(userData);

    console.log("✅ Stream response:", result);

    return result;
  } catch (err) {
    console.error("❌ Stream error full:", err);
    throw err;
  }
};

export const deleteStreamUser = async(userId) => {
  try {
    // Stream's deleteUser expects a string ID, not an object
    await deleteStreamUser(sanitizeStreamUserId(id));
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

