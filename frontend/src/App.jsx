import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useClerkAuthSync, waitForClerkToken } from "./hooks/useClerkAuthSync.js";

import HomePage from "./pages/HomePage.jsx";
import ProblemPage from "./pages/ProblemPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProblemsPage from "./pages/ProblemsPage.jsx";
import SessionPage from "./pages/SessionPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import DemoPage from "./pages/DemoPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import BooksPage from "./pages/BooksPage.jsx";
import { useAdminAccess } from "./hooks/useAdminAccess.js";

import FloatingAIWidget from "./components/FloatingAIWidget.jsx";
import { Toaster } from "react-hot-toast";

import { StreamChat } from "stream-chat";
import { sessionApi } from "./api/sessions.js";

function App() {
  const { user } = useUser();
  const { authReady, authTokenReady, isLoaded, isSignedIn } = useClerkAuthSync();
  const location = useLocation();
  const [hasNewCommunityMessage, setHasNewCommunityMessage] = useState(false);
  const { data: adminAccess, isLoading: loadingAdminAccess } = useAdminAccess(
    isSignedIn && authReady && authTokenReady
  );
  const isAdmin = Boolean(adminAccess?.isAdmin);

  // StrictMode dev double-run guard
  const initOnceRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user || !authTokenReady) return;

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
        const clerkToken = await waitForClerkToken();
        if (!clerkToken || cancelled) return;

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
  }, [isSignedIn, user?.id, authTokenReady]);

  useEffect(() => {
    if (location.pathname === "/community") {
      setHasNewCommunityMessage(false);
      window.dispatchEvent(
        new CustomEvent("arena-community-notify", { detail: { hasNew: false } })
      );
    }
  }, [location.pathname]);

  if (!isLoaded || (isSignedIn && (!authReady || !authTokenReady))) {
    return (
      <div className="h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center px-6 py-8 rounded-3xl border border-base-300 shadow-2xl bg-base-100">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <h2 className="text-2xl font-bold">Loading CodeArena</h2>
          <p className="text-base-content/70 mt-2">Preparing your workspace. Please wait a moment.</p>
        </div>
      </div>
    );
  }

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
          path="/books"
          element={isSignedIn ? <BooksPage /> : <Navigate to={"/"} />}
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
        <Route path="/session/:id" element={<SessionPage />} />
        <Route
          path="/admin"
          element={
            !isSignedIn ? (
              <Navigate to="/" />
            ) : loadingAdminAccess ? null : isAdmin ? (
              <AdminPage />
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
      </Routes>

      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      {isSignedIn && <FloatingAIWidget />}
    </>
  );
}

export default App;
