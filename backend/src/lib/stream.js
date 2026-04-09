import { StreamChat } from "stream-chat";
import { ENV } from "./env.js";

const apiKey = ENV.STREAM_API_KEY;
const apiSecret = ENV.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error("STREAM_API_KEY or STREAM_API_SECRET is missing in env variables");
}

/**
 * Initialize Stream Chat client for server-side usage
 * disableCache: true prevents memory leaks in serverless environments
 */
export const chatClient = StreamChat.getInstance(apiKey, apiSecret, {
  disableCache: true,
  timeout: 10000,
});

/**
 * Sanitize user ID to comply with Stream Chat requirements
 * Stream only allows: a-z, 0-9, @, _, - [[4]]
 */
export const sanitizeStreamUserId = (clerkId) => {
  if (!clerkId) return null;
  
  // Convert to string and replace invalid characters with underscore
  return clerkId
    .toString()
    .replace(/[^a-zA-Z0-9@_\-.]/g, '_')  // Replace invalid chars
    .toLowerCase()                        // Stream IDs are case-sensitive but lowercase is safer
    .slice(0, 64);                        // Stream has 64 char limit for IDs
};

/**
 * Upsert user to Stream Chat with proper error handling
 */
export const upsertStreamUser = async (userData) => {
  try {
    console.log("📤 Stream upsertUser payload:", {
      id: userData.id,
      name: userData.name,
      hasImage: !!userData.image,
    });

    // Validate required field
    if (!userData?.id) {
      throw new Error("Stream user ID is required");
    }

    const result = await chatClient.upsertUser({
      id: userData.id,
      name: userData.name || userData.id, // Fallback name
      image: userData.image,
      // Add custom fields if needed
      custom: {
        clerkId: userData.clerkId, // Store original Clerk ID for reference
        ...userData.custom,
      },
    });

    console.log("✅ Stream upsertUser success:", {
      userId: userData.id,
      user: result.user?.id,
    });

    return result;
  } catch (err) {
    console.error("❌ Stream upsertUser failed:", {
      error: err.message,
      code: err.code,
      userId: userData?.id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    
    // Re-throw with context for Inngest retry logic [[15]]
    throw new Error(`Stream upsert failed: ${err.message}`, { cause: err });
  }
};

/**
 * Delete user from Stream Chat
 */
export const deleteStreamUser = async (userId) => {
  try {
    const streamUserId = sanitizeStreamUserId(userId);
    
    if (!streamUserId) {
      console.warn("⚠️ Cannot delete Stream user: invalid userId", userId);
      return { success: false, reason: "invalid_user_id" };
    }

    console.log("🗑️ Deleting Stream user:", streamUserId);
    
    await chatClient.deleteUser(streamUserId);

    console.log("✅ Stream user deleted:", streamUserId);
    return { success: true, userId: streamUserId };
  } catch (err) {
    // Handle "user not found" gracefully (idempotent delete)
    if (err?.code === 404 || err?.message?.includes("not found")) {
      console.log("ℹ️ Stream user already deleted or not found:", userId);
      return { success: true, alreadyDeleted: true };
    }

    console.error("❌ Stream deleteUser failed:", {
      error: err.message,
      userId,
    });
    
    throw new Error(`Stream delete failed: ${err.message}`, { cause: err });
  }
};