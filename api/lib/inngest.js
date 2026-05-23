import { Inngest } from "inngest";
import User from "../models/User.js";
import { connectDB } from "./db.js";
import { ENV } from "./env.js";
import { upsertStreamUser, deleteStreamUser } from "./stream.js";

export const inngest = new Inngest({     
  id: "code-arena",
  signingKey: ENV.INNGEST_SIGNING_KEY,
});

const sanitizeStreamUserId = (id) => {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
};

export const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "user.created" },
  async ({ event, step }) => {
    await connectDB();

    const {
      id,
      email_addresses,
      first_name,
      last_name,
      image_url,
    } = event.data;

    const emailAddress = email_addresses?.[0]?.email_address?.toLowerCase();
    const userPayload = {
      clerkId: id,
      email: emailAddress,
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      profileImage: image_url,
      role: emailAddress === ENV.ADMIN_EMAIL ? "admin" : "user",
    };

    const newUser = await step.run("save-user-db", async () => {
      return await User.findOneAndUpdate(
        { clerkId: id },
        userPayload,
        {
          upsert: true,
          new: true,
        }
      );
    });

    await step.run("sync-user-stream", async () => {
      const streamUserId = sanitizeStreamUserId(newUser.clerkId);

      return await upsertStreamUser({
        id: streamUserId,
        name: newUser.name || streamUserId,
        image: newUser.profileImage,
      });
    });

    return {
      message: "User synced successfully",
      clerkId: id,
    };

    // challange:send a welcome email here later - once i complete
  }
);

export const removeUser = inngest.createFunction(
  { id: "delete-user" },
  { event: "user.deleted" },
  async ({ event, step }) => {
    await connectDB();

    const { id } = event.data;

    await step.run("delete-user-db", async () => {
      await User.findOneAndDelete({ clerkId: id });
    });

    await step.run("delete-user-stream", async () => {
      await deleteStreamUser(sanitizeStreamUserId(id));
    });

    return {
      message: "User deleted successfully",
    };
  }
);





export const functions = [syncUser, removeUser];