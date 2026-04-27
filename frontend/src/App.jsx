import { useState, useEffect } from 'react'
import { useUser } from "@clerk/clerk-react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import HomePage from './pages/home.jsx';
import ProblemPage from './pages/ProblemPage.jsx';
import { Toaster } from "react-hot-toast";
import DashboardPage from "./pages/dashboard.jsx"
import ProblemsPage from './pages/problemspage.jsx';
import SessionPage from './pages/SessionPage.jsx';
import FloatingAIWidget from './components/FloatingAIWidget.jsx';
import CommunityPage from './pages/CommunityPage.jsx';
import DemoPage from './pages/DemoPage.jsx';
import { StreamChat } from 'stream-chat';
import { sessionApi } from './api/sessions.js';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

function App() {
  const { isSignedIn, isLoaded, user } = useUser();
  const location = useLocation();
  const [hasNewCommunityMessage, setHasNewCommunityMessage] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !user) return;

    let chatClient = null;
    let channel = null;

    const initGlobalListener = async () => {
      try {
        const { token, userId, userName, userImage } = await sessionApi.getStreamToken();

        if (!token || !userId) return; // guard against malformed response

        chatClient = StreamChat.getInstance(STREAM_API_KEY);

        await chatClient.connectUser(
          { id: userId, name: userName, image: userImage },
          token
        );

        channel = chatClient.channel('messaging', 'arena-global-community');
        await channel.watch();

        channel.on('message.new', event => {
          try {
            if (window.location.pathname !== '/community' && event.user.id !== userId) {
              setHasNewCommunityMessage(true);
              window.dispatchEvent(new CustomEvent('arena-community-notify', { detail: { hasNew: true } }));
            }
          } catch (error) {
            console.error('Error handling community message:', error);
          }
        });
      } catch (err) {
        // Non-fatal — community notifications won't work but app continues
        if (err?.response?.status !== 404) {
          console.error("Global stream listener error:", err);
        }
      }
    };

    initGlobalListener();

    return () => {
      try {
        if (chatClient) chatClient.disconnectUser();
      } catch (error) {
        console.error('Error disconnecting chat client:', error);
      }
    };
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    try {
      if (location.pathname === '/community') {
        setHasNewCommunityMessage(false);
        window.dispatchEvent(new CustomEvent('arena-community-notify', { detail: { hasNew: false } }));
      }
    } catch (error) {
      console.error('Error handling location change:', error);
    }
  }, [location.pathname]);

  if (!isLoaded) return null

  return (
    <>
      <Routes>
        <Route path="/" element={!isSignedIn ? <HomePage /> : <Navigate to={"/dashboard"} />}></Route>
        <Route path="/dashboard" element={isSignedIn ? <DashboardPage /> : <Navigate to={"/"} />}></Route>
        <Route path="/problems" element={isSignedIn ? <ProblemsPage /> : <Navigate to={"/"} />} />
        <Route path="/community" element={isSignedIn ? <CommunityPage /> : <Navigate to={"/"} />} />
        <Route path="/problem/:id" element={isSignedIn ? <ProblemPage /> : <Navigate to={"/"} />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/session/:id" element={isSignedIn ? <SessionPage /> : <Navigate to={"/"} />} />
      </Routes>
      <Toaster position='top-right' toastOptions={{ duration: 3000 }} />
      {isSignedIn && <FloatingAIWidget />}
    </>
  )
}

export default App
