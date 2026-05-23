import { useState, useEffect } from "react";
import { StreamChat } from "stream-chat";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { initializeStreamClient, disconnectStreamClient } from "../lib/stream.js";
import { sessionApi } from "../api/sessions.js";
import { waitForClerkToken } from "./useClerkAuthSync.js";

function useStreamClient(session, loadingSession, isHost, isParticipant, authTokenReady) {
  const { user } = useUser();

  const [streamClient, setStreamClient] = useState(null);
  const [call, setCall] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isInitializingCall, setIsInitializingCall] = useState(true);
  const [videoBlockedReason, setVideoBlockedReason] = useState(null);

  const canInitVideo = isHost || isParticipant;

  useEffect(() => {
    let isCancelled = false;

    let videoCall = null;
    let videoClient = null;
    let chatClientInstance = null;
    let callJoined = false;

    const initCall = async () => {
      setVideoBlockedReason(null);

      if (!session?.callId || session.status === "completed") {
        setIsInitializingCall(false);
        return;
      }

      if (!authTokenReady) {
        setIsInitializingCall(true);
        return;
      }

      if (!canInitVideo) {
        setVideoBlockedReason("join_required");
        setIsInitializingCall(false);
        return;
      }

      setIsInitializingCall(true);

      try {
        const token = await waitForClerkToken();
        if (!token) {
          setVideoBlockedReason("auth");
          return;
        }

        const { token: streamToken, userId, userName, userImage } =
          await sessionApi.getStreamToken();

        if (isCancelled) return;

        videoClient = await initializeStreamClient(
          { id: userId, name: userName, image: userImage },
          streamToken
        );

        if (isCancelled) return;

        setStreamClient(videoClient);

        videoCall = videoClient.call("default", session.callId);
        await videoCall.join({ create: true });
        callJoined = true;

        if (isCancelled) return;
        setCall(videoCall);

        const apiKey = import.meta.env.VITE_STREAM_API_KEY;
        if (!apiKey) {
          throw new Error("VITE_STREAM_API_KEY is missing");
        }

        chatClientInstance = StreamChat.getInstance(apiKey);

        if (
          chatClientInstance.userID &&
          chatClientInstance.userID !== userId
        ) {
          await chatClientInstance.disconnectUser();
        }

        await chatClientInstance.connectUser(
          { id: userId, name: userName, image: userImage },
          streamToken
        );

        if (isCancelled) return;

        setChatClient(chatClientInstance);

        const chatChannel = chatClientInstance.channel(
          "messaging",
          session.callId
        );

        await chatChannel.watch();

        if (isCancelled) return;
        setChannel(chatChannel);
        setVideoBlockedReason(null);
      } catch (error) {
        const status = error?.response?.status;
        if (status === 401) {
          setVideoBlockedReason("auth");
        } else {
          setVideoBlockedReason("error");
          toast.error("Failed to join video call");
        }
      } finally {
        if (!isCancelled) {
          setIsInitializingCall(false);
        }
      }
    };

    if (session && !loadingSession) {
      initCall();
    } else if (!loadingSession) {
      setIsInitializingCall(false);
    }

    return () => {
      isCancelled = true;

      const cleanup = async () => {
        try {
          if (videoCall && callJoined) {
            await videoCall.leave();
          }
        } catch {
          // Ignored
        }

        try {
          if (chatClientInstance?.userID) {
            await chatClientInstance.disconnectUser();
          }
        } catch {
          // Ignored
        }

        try {
          if (videoClient) {
            await disconnectStreamClient(videoClient);
          }
        } catch {
          // Ignored
        }
      };

      cleanup();

      setCall(null);
      setChatClient(null);
      setChannel(null);
      setStreamClient(null);
      setIsInitializingCall(true);
      setVideoBlockedReason(null);
    };
  }, [
    session?.callId,
    session?.status,
    loadingSession,
    isHost,
    isParticipant,
    canInitVideo,
    authTokenReady,
    user?.id,
  ]);

  return {
    streamClient,
    call,
    chatClient,
    channel,
    isInitializingCall,
    videoBlockedReason,
    canInitVideo,
  };
}

export default useStreamClient;
