import { Inngest } from "inngest";
import User from "../models/User.js"; 
import { connectDB } from "./db.js";

export const inngest = new Inngest({ id: "code-arena" });

// 1. Function: User Create ya Update ke liye
export const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "user.created" }, // Clerk ka sahi event name
  async ({ event }) => {
    await connectDB();
    const { id, email_addresses, first_name, last_name, image_url } = event.data;

    const userPayload = {
      clerkId: id,
      email: email_addresses?.[0]?.email_address,
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      profileImage: image_url,
    };

    await User.findOneAndUpdate({ clerkId: id }, userPayload, { upsert: true });
    return { message: "User created/synced" };
  }
);

// 2. Function: User Delete karne ke liye
export const deleteUser = inngest.createFunction(
  { id: "delete-user" },
  { event: "user.deleted" }, // Clerk jab user delete karega
  async ({ event }) => {
    await connectDB();
    const { id } = event.data; // Clerk delete event mein sirf ID bhejta hai

    await User.findOneAndDelete({ clerkId: id });
    return { message: "User deleted from MongoDB" };
  }
);

// Dono functions ko export karein small 'f' ke saath
export const functions = [syncUser, deleteUser];
