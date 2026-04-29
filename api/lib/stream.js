import { StreamChat } from "stream-chat";
import { StreamClient } from "@stream-io/node-sdk";

const STREAM_TIMEOUT_MS = 30000;

function getApiKey() {
  const key = process.env.STREAM_API_KEY;
  if (!key) throw new Error("STREAM_API_KEY is missing in environment variables");
  return key;
}

function getApiSecret() {
  const secret = process.env.STREAM_API_SECRET;
  if (!secret) throw new Error("STREAM_API_SECRET is missing in environment variables");
  return secret;
}

// Lazy singletons — created on first use, not at module load time
let _streamClient = null;
let _chatClient = null;

export function getStreamClient() {
  if (!_streamClient) {
    _streamClient = new StreamClient(getApiKey(), getApiSecret(), {
      timeout: STREAM_TIMEOUT_MS,
    });
  }
  return _streamClient;
}

export function getChatClient() {
  if (!_chatClient) {
    _chatClient = StreamChat.getInstance(getApiKey(), getApiSecret(), {
      disableCache: true,
      timeout: STREAM_TIMEOUT_MS,
    });
  }
  return _chatClient;
}

// Keep named exports for backward compatibility with existing imports
export const streamClient = new Proxy({}, {
  get(_, prop) {
    return getStreamClient()[prop];
  }
});

export const chatClient = new Proxy({}, {
  get(_, prop) {
    return getChatClient()[prop];
  }
});

export const upsertStreamUser = async (userData) => {
  try {
    const result = await getChatClient().upsertUser(userData);
    return result;
  } catch (err) {
    console.error("❌ Stream upsert failed:", err.message);
    throw err;
  }
};

export const deleteStreamUser = async (userId) => {
  try {
    await getChatClient().deleteUser(userId.toString());
    return { success: true };
  } catch (err) {
    console.error("❌ Stream delete failed:", err.message);
    throw err;
  }
};
