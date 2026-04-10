import { StreamChat } from "stream-chat";
import { ENV } from "./env.js";

const apiKey = ENV.STREAM_API_KEY;
const apiSecret = ENV.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error("STREAM_API_KEY or STREAM_API_SECRET is missing in env variables");
}

export const chatClient = StreamChat.getInstance(apiKey, apiSecret, {
  disableCache: true,
  timeout: 10000,
});

export const upsertStreamUser = async (userData) => {
  try {
    console.log("📤 Sending user to Stream:", userData);

    const result = await chatClient.upsertUser(userData);

    console.log("✅ Stream user synced:", userData.id);

    return result;
  } catch (err) {
    console.error("❌ Stream upsert failed:", err.message);
    throw err;
  }
};

export const deleteStreamUser = async (userId) => {
  try {
    await chatClient.deleteUser(userId.toString());

    console.log("✅ Stream user deleted:", userId);

    return { success: true };
  } catch (err) {
    console.error("❌ Stream delete failed:", err.message);
    throw err;
  }
};