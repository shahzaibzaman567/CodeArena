import { getAuth, clerkClient, verifyToken } from "@clerk/express";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";
import { getClerkPrimaryEmail, buildFallbackEmail, normalizeEmail } from "../lib/normalizeEmail.js";

const syncClerkUser = async (clerkId) => {
  const clerkUser = await clerkClient.users.getUser(clerkId);
  if (!clerkUser) {
    return null;
  }

  let email = getClerkPrimaryEmail(clerkUser);
  if (!email) {
    email = buildFallbackEmail(clerkId);
  }

  const name =
    [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email.split("@")[0] ||
    clerkId;

  const profileImage = clerkUser.image_url || clerkUser.profile_image_url || "";
  const existingUser = await User.findOne({ clerkId });
  const role =
    existingUser?.role === "admin" || normalizeEmail(email) === ENV.ADMIN_EMAIL ? "admin" : "user";

  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      clerkId,
      email,
      name,
      profileImage,
      role,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return user;
};

async function resolveClerkId(req) {
  const auth = getAuth(req);
  if (auth?.userId) {
    return auth.userId;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice(7).trim();
  if (!token || !ENV.CLERK_SECRET_KEY) {
    return null;
  }

  try {
    const payload = await verifyToken(token, { secretKey: ENV.CLERK_SECRET_KEY });
    return payload?.sub || null;
  } catch (err) {
    console.warn("[protectRoute] Bearer token verification failed:", err.message);
    return null;
  }
}

export const protectRoute = async (req, res, next) => {
  try {
    const clerkId = await resolveClerkId(req);

    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let user = await User.findOne({ clerkId });

    if (!user || !user.email?.trim()) {
      user = await syncClerkUser(clerkId);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      const now = new Date();
      if (!user.lastActiveAt || now.getTime() - new Date(user.lastActiveAt).getTime() > 60 * 1000) {
        user.lastActiveAt = now;
        await user.save();
      }
    } catch (activityErr) {
      console.warn("[protectRoute] Failed to update lastActiveAt:", activityErr.message);
    }

    req.user = user;
    req.auth = { ...(req.auth || {}), userId: clerkId };
    next();
  } catch (err) {
    console.error("[protectRoute] Error:", err.message);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const requireAdmin = (req, res, next) => {
  const adminEmail = ENV.ADMIN_EMAIL;
  if (req.user?.role !== "admin" && req.user?.email?.toLowerCase() !== adminEmail) {
    return res.status(403).json({ message: "Forbidden: Admin access only" });
  }
  next();
};
