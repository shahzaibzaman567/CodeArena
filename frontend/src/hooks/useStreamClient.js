import { useState, useEffect } from "react";
import { StreamChat } from "stream-chat";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { initializeStreamClient, disconnectStreamClient } from "../lib/stream.js";
import { sessionApi } from "../api/sessions.js";

function useStreamClient(session, loadingSession, isHost, isParticipant) {
  const { user } = useUser();
  const [streamClient, setStreamClient] = useState(null);
  const [call, setCall] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isInitializingCall, setIsInitializingCall] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let videoCall = null;
    let videoClient = null;
    let chatClientInstance = null;
    let callJoined = false; // track whether join() actually completed

    const initCall = async () => {
      if (!session?.callId || (!isHost && !isParticipant) || session.status === "completed") {
        setIsInitializingCall(false);
        return;
      }

      try {
        const { token, userId, userName, userImage } = await sessionApi.getStreamToken();

        videoClient = await initializeStreamClient(
          {
            id: userId,
            name: userName,
            image: userImage,
          },
          token
        );

        if (isCancelled) return;

        setStreamClient(videoClient);

        videoCall = videoClient.call("default", session.callId);
        await videoCall.join({ create: true });
        callJoined = true; // only set after successful join

        if (isCancelled) return;
        setCall(videoCall);

        const apiKey = import.meta.env.VITE_STREAM_API_KEY;
        if (!apiKey) {
          throw new Error("VITE_STREAM_API_KEY is missing");
        }

        chatClientInstance = StreamChat.getInstance(apiKey);

        const needsConnection = chatClientInstance.userID !== userId;

        if (needsConnection) {
          if (chatClientInstance.userID) {
            await chatClientInstance.disconnectUser();
          }
          await chatClientInstance.connectUser(
            { id: userId, name: userName, image: userImage },
            token
          );
        }

        if (isCancelled) return;
        setChatClient(chatClientInstance);

        const chatChannel = chatClientInstance.channel("messaging", session.callId);
        await chatChannel.watch();
        if (isCancelled) return;
        setChannel(chatChannel);
      } catch (error) {
        if (!isCancelled) {
          toast.error("Failed to join video call");
          console.error("Stream init error:", error.message);
        }
      } finally {
        if (!isCancelled) {
          setIsInitializingCall(false);
        }
      }
    };

    if (session && !loadingSession) initCall();

    return () => {
      isCancelled = true;
      const cleanup = async () => {
        try {
          // Only leave if join() actually completed — prevents "already left" error
          if (videoCall && callJoined) {
            await videoCall.leave();
          }
        } catch (err) {
          // Silently ignore SFU stats flush errors and "already left" errors
          const msg = err?.message || "";
          if (
            !msg.includes("already been left") &&
            !msg.includes("SfuStatsReporter") &&
            !msg.includes("flush")
          ) {
            console.error("Call leave error:", msg);
          }
        }
        try {
          if (chatClientInstance?.userID) {
            await chatClientInstance.disconnectUser();
          }
        } catch {
          // ignore chat disconnect errors on cleanup
        }
        try {
          if (videoClient) await disconnectStreamClient(videoClient);
        } catch {
          // ignore video client disconnect errors on cleanup
        }
      };
      cleanup();

      setCall(null);
      setChatClient(null);
      setChannel(null);
      setStreamClient(null);
      setIsInitializingCall(true);
    };
  }, [session?.callId, session?.status, loadingSession, isHost, isParticipant, user?.id]);

  return {
    streamClient,
    call,
    chatClient,
    channel,
    isInitializingCall,
  };
}

export default useStreamClient;
