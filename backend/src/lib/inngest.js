import { Inngest } from "inngest";
import User from "../models/User.js";
import { connectDB } from "./db.js";
import { ENV } from "./env.js";
import { upsertStreamUser, deleteStreamUser } from "./stream.js";

export const inngest = new Inngest({
  id: "code-arena",
  signingKey: ENV.INNGEST_SIGNING_KEY
});

// 1. Function: User Create ya Update ke liye
export const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "user.created" }, // Clerk correct event name
  async ({ event , step}) => {
    await connectDB();
    const { id, email_addresses, first_name, last_name, image_url } = event.data;

    const userPayload = {
      clerkId: id,
      email: email_addresses?.[0]?.email_address,
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      profileImage: image_url,
    };

      const newUser = await step.run("update-db", async () => {
      return await User.findOneAndUpdate({ clerkId: id }, userPayload, { upsert: true, new: true });
    });

     await step.run("sync-to-stream", async () => {
      return await upsertStreamUser({
        id: newUser.clerkId.toString(),
        name: newUser.name,
        image: newUser.profileImage,
      });
    });



    return { message: "User created/synced" };
  }
);
// 2. Function: User Delete karne ke liye
export const deleteUser = inngest.createFunction(
  { id: "delete-user" },
  { event: "user.deleted" }, // Clerk  user deleteted 
  async ({ event }) => {
    await connectDB();
    const { id } = event.data; // Clerk delete event 

    await User.findOneAndDelete({ clerkId: id });

    await deleteStreamUser(id.toString())

    return { message: "User deleted from MongoDB" };
  }
);

//  functions  export
export const functions = [syncUser, deleteUser];
