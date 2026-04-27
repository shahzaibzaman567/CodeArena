import { StreamVideoClient } from "@stream-io/video-client";

export async function initializeStreamClient(user, token) {
  const apiKey = import.meta.env.VITE_STREAM_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_STREAM_API_KEY is missing");
  }

  if (!user?.id) {
    throw new Error("A valid Stream user is required");
  }

  if (!token) {
    throw new Error("A valid Stream token is required");
  }

  return new StreamVideoClient({
    apiKey,
    user,
    token,
  });
}

export async function disconnectStreamClient(client) {
  if (!client) return;
  await client.disconnectUser().catch(() => {});
}
