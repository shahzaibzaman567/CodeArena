import { useState, useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import HomePage from "./pages/home.jsx";
import ProblemPage from "./pages/ProblemPage.jsx";
import DashboardPage from "./pages/dashboard.jsx";
import ProblemsPage from "./pages/problemspage.jsx";
import SessionPage from "./pages/SessionPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import DemoPage from "./pages/DemoPage.jsx";

import FloatingAIWidget from "./components/FloatingAIWidget.jsx";
import { Toaster } from "react-hot-toast";

import { StreamChat } from "stream-chat";
import { sessionApi } from "./api/sessions.js";

function App() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const [hasNewCommunityMessage, setHasNewCommunityMessage] = useState(false);

  // 🔥 Sync Clerk Token to Axios window var (Cross-Domain Fix)
  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn) {
        const token = await getToken();
        window.__clerk_token = token;
      } else {
        window.__clerk_token = null;
      }
    };
    syncToken();
    const interval = setInterval(syncToken, 1000 * 50); // Refresh every 50s
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  // StrictMode dev double-run guard
  const initOnceRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user) return;

    const apiKey = import.meta.env.VITE_STREAM_API_KEY;
    if (!apiKey) {
      return;
    }

    let cancelled = false;
    let chatClient = null;
    let channel = null;

    const initGlobalListener = async () => {
      if (initOnceRef.current) return;
      initOnceRef.current = true;

      try {
        const { token, userId, userName, userImage } =
          await sessionApi.getStreamToken();

        if (!token || !userId) return;

        chatClient = StreamChat.getInstance(apiKey);

        // Clean state (important for dev reload + strict mode)
        if (chatClient.userID && chatClient.userID !== userId) {
          await chatClient.disconnectUser();
        }

        // MUST connect before creating channel
        // Robust check: ensure both userID is set AND user object is present
        if (!chatClient.user || chatClient.userID !== userId) {
          if (!userId) {
            throw new Error("Stream Connection Error: User ID not provided by backend.");
          }
          await chatClient.connectUser(
            { id: userId, name: userName || userId, image: userImage },
            token
          );
        }

        if (cancelled) return;

        channel = chatClient.channel("messaging", "arena-global-community");
        await channel.watch();

        channel.on("message.new", (event) => {
          if (cancelled) return;

          try {
            if (
              window.location.pathname !== "/community" &&
              event?.user?.id !== userId
            ) {
              setHasNewCommunityMessage(true);
              window.dispatchEvent(
                new CustomEvent("arena-community-notify", {
                  detail: { hasNew: true },
                })
              );
            }
          } catch (e) {
            // Ignored
          }
        });
      } catch (err) {
        // Ignored
      }
    };

    initGlobalListener();

    return () => {
      cancelled = true;
      initOnceRef.current = false;
      // Do NOT disconnect here — CommunityPage reuses this same singleton connection
    };
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    if (location.pathname === "/community") {
      setHasNewCommunityMessage(false);
      window.dispatchEvent(
        new CustomEvent("arena-community-notify", { detail: { hasNew: false } })
      );
    }
  }, [location.pathname]);

  if (!isLoaded) return null;

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={!isSignedIn ? <HomePage /> : <Navigate to={"/dashboard"} />}
        />
        <Route
          path="/dashboard"
          element={isSignedIn ? <DashboardPage /> : <Navigate to={"/"} />}
        />
        <Route
          path="/problems"
          element={isSignedIn ? <ProblemsPage /> : <Navigate to={"/"} />}
        />
        <Route
          path="/community"
          element={isSignedIn ? <CommunityPage /> : <Navigate to={"/"} />}
        />
        <Route
          path="/problem/:id"
          element={isSignedIn ? <ProblemPage /> : <Navigate to={"/"} />}
        />
        <Route path="/demo" element={<DemoPage />} />
        <Route
          path="/session/:id"
          element={isSignedIn ? <SessionPage /> : <Navigate to={"/"} />}
        />
      </Routes>

      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      {isSignedIn && <FloatingAIWidget />}
    </>
  );
}

export default App;
