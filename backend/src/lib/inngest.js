import { Inngest } from "inngest";
import { connectDB } from "./db.js";
import User from "../models/User.js";

export const inngest = new Inngest({ id: "code-arena" });

export const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "user.created" }, // Clerk ka asli event name
  async ({ event }) => {
    await connectDB();
const data = event.data; // Clerk ka poora object
const { id, email_addresses, first_name, last_name, image_url } = data
console.log("Received Clerk Data:", JSON.stringify(event.data, null, 2));

    const userPayload = {
      clerkId: id,
      email: email_addresses?.[0]?.email_address,
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      profileImage: image_url,
    };

    await User.findOneAndUpdate({ clerkId: id }, userPayload, { upsert: true });
    return { message: "User synced" };
  }
);

// Exports hamesha small 'f' ke saath rakhein
export const functions = [syncUser]; 
