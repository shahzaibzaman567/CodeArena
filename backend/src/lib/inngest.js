import { Inngest } from "inngest";
// Note: Is file mein connectDB aur User model tabhi import karein jab zaroorat ho
import User from "../models/User.js"; 

export const inngest = new Inngest({ id: "code-arena" });

export const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "clerk/user.created" }, // Clerk event structure check karein
  async ({ event, step }) => {
    const { id, email_addresses, first_name, last_name, image_url } = event.data;

    const userPayload = {
      clerkId: id,
      email: email_addresses?.[0]?.email_address,
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      profileImage: image_url,
    };

    // Database operation
    await User.findOneAndUpdate({ clerkId: id }, userPayload, { upsert: true });
    return { message: "User synced" };
  }
);

// Hamesha 'functions' (small f) export karein
export const functions = [syncUser]; 
