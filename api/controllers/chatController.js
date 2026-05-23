import { getChatClient, getStreamClient } from "../lib/stream.js";

const COMMUNITY_CHANNEL_ID = "arena-global-community";

export const getStreamToken = async (req, res) => {
  try {
    const userId = req.user?.clerkId || req.auth?.userId;
    if (!userId) {
      return res.status(400).json({ message: "Authenticated user is missing a Clerk ID." });
    }
    const chatClient = getChatClient();
    const streamClient = getStreamClient();

    // 1. Ensure the user exists in Stream
    await chatClient.upsertUser({
      id: userId,
      name: req.user.name,
      image: req.user.profileImage,
      role: "user",
    });

    // 2. Ensure the global community channel exists and add user as member
    //    This runs server-side with admin rights — no permission issues
    try {
      const communityChannel = chatClient.channel("messaging", COMMUNITY_CHANNEL_ID, {
        name: "Arena Global Community",
        image: "https://api.dicebear.com/7.x/shapes/svg?seed=community",
        created_by_id: userId, // first caller becomes creator
      });

      // Create channel if it doesn't exist (idempotent)
      await communityChannel.create();

      // Add the user as a member so they have ReadChannel permission
      await communityChannel.addMembers([userId]);
    } catch (channelErr) {
      // Non-fatal — log but don't block token issuance
      console.warn("Community channel setup warning:", channelErr.message);
    }

    // 3. Issue JWT with clock-skew fix
    const now = Math.floor(Date.now() / 1000);
    const issuedAt  = now - 60;        // backdate 60s to fix JWTAuth iat error
    const expiresAt = now + 60 * 60;   // expire in 1 hour

    const token = streamClient.createToken(userId, expiresAt, issuedAt);

    res.status(200).json({
      token,
      userId,
      userImage: req.user.profileImage,
      userName: req.user.name,
    });
  } catch (err) {
    console.error("Error in getStreamToken controller:", err.message);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};