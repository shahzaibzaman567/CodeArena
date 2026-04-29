import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Loader, Globe, MessageSquare, Sparkles, Users } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { StreamChat } from "stream-chat";
import {
  Chat,
  Channel,
  Window,
  MessageList,
  MessageComposer,
  Thread,
} from "stream-chat-react";
import "stream-chat-react/dist/css/index.css";
import { sessionApi } from "../api/sessions.js";
import toast from "react-hot-toast";

const API_KEY = import.meta.env.VITE_STREAM_API_KEY;

// ─── Active Users Right Sidebar ──────────────────────────────────────────────
function ActiveUsersSidebar({ chatClient }) {
  const [allUsers, setAllUsers]   = useState([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(false);

  // Fetch all users who have recently been active in Stream
  // Stream marks a user as "online" the moment they connectUser() — 
  // which happens in App.jsx as soon as they log in.
  const fetchOnlineUsers = async () => {
    if (!chatClient) return;
    setLoading(true);
    try {
      const filter = search.trim()
        ? { name: { $autocomplete: search.trim() } }
        : {};
      const { users } = await chatClient.queryUsers(
        filter,
        { last_active: -1 },
        { presence: true, limit: 30 }
      );
      // Only keep users who Stream considers "online"
      setAllUsers(users.filter((u) => u.online));
    } catch (err) {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  // Refresh on mount and every 15 s
  useEffect(() => {
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 15000);
    return () => clearInterval(interval);
  }, [chatClient]);

  // Re-query when search changes (debounced 400 ms)
  useEffect(() => {
    const t = setTimeout(fetchOnlineUsers, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="hidden xl:flex w-60 shrink-0 flex-col bg-base-100 border-l border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-primary" />
          <span className="font-black text-[10px] uppercase tracking-widest opacity-50">Online</span>
        </div>
        <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 rounded-full px-2.5 py-1">
          <span className="size-1.5 bg-success rounded-full animate-pulse" />
          <span className="text-success font-black text-[10px]">{allUsers.length}</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2.5 border-b border-base-300 shrink-0">
        <div className="flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2 border border-base-300 focus-within:border-primary transition-colors">
          <svg className="size-3.5 opacity-40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            className="bg-transparent text-xs w-full outline-none font-medium placeholder:opacity-40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 custom-scrollbar">
        {loading && allUsers.length === 0 ? (
          <div className="flex justify-center py-6 opacity-30">
            <Loader className="size-5 animate-spin" />
          </div>
        ) : allUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-20">
            <Users className="size-8 mb-2" />
            <p className="text-[11px] font-bold uppercase">No one online</p>
          </div>
        ) : (
          allUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-base-200 transition-colors cursor-default"
            >
              {/* Small avatar */}
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-lg overflow-hidden border border-base-300 shadow-sm">
                  <img
                    src={u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                    alt={u.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 size-2 bg-success border border-base-100 rounded-full" />
              </div>
              {/* Name only — one row */}
              <p className="text-xs font-bold truncate flex-1">{u.name || "User"}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main CommunityPage ───────────────────────────────────────────────────────
function CommunityPage() {
  const { user: clerkUser } = useUser();
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const client = StreamChat.getInstance(API_KEY);

    const setupChat = async () => {
      try {
        setLoading(true);
        const { token, userId, userName, userImage } = await sessionApi.getStreamToken();

        if (isCancelled) return;

        // 🛡️ Senior Dev: Robust connection check using singleton pattern
        // If client is already connected to someone else, disconnect first
        if (client.userID && client.userID !== userId) {
            await client.disconnectUser();
        }
        
        // MUST connect before creating channel
        // Robust check: ensure both userID is set AND user object is present
        if (!client.user || client.userID !== userId) {
          if (!userId) {
            throw new Error("Stream Connection Error: User ID is missing.");
          }
          await client.connectUser({ id: userId, name: userName || userId, image: userImage }, token);
        }

        if (isCancelled) return;

        const communityChannel = client.channel("messaging", "arena-global-community");
        await communityChannel.watch({ presence: true });

        // 🚀 Listen for new messages and notify Navbar
        const handleNewMessage = (event) => {
          // Don't notify if user is currently on community page
          if (window.location.pathname !== '/community') {
            window.dispatchEvent(new CustomEvent('arena-community-notify', { 
              detail: { hasNew: true } 
            }));
          }
        };
        communityChannel.on('message.new', handleNewMessage);

        if (isCancelled) return;
        setChatClient(client);
        setChannel(communityChannel);
      } catch (error) {
        if (!isCancelled) {
          toast.error("Stream Connection Error: " + (error.message || "Please refresh"));
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    if (clerkUser) {
        setupChat();
    }

    return () => {
      isCancelled = true;
      // Note: We don't disconnect here to keep the global connection alive 
      // but we do stop the setup process.
    };
  }, [clerkUser?.id]); // Use ID to prevent unnecessary re-runs

  if (loading) {
    return (
      <div className="h-screen bg-base-200 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="size-12 animate-spin text-primary" />
            <p className="font-bold text-base-content/50 uppercase tracking-widest text-sm">
              Connecting to Arena Hub...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-base-200 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 max-w-[1400px] mx-auto w-full flex flex-col lg:flex-row overflow-hidden lg:p-6 gap-6">
        {/* ── LEFT SIDEBAR - Info ── */}
        <div className="hidden lg:flex w-72 flex-col space-y-5 shrink-0">
          <div className="card bg-gradient-to-br from-primary to-secondary text-primary-content shadow-2xl">
            <div className="card-body p-7">
              <div className="flex items-center gap-4 mb-5">
                <div className="size-11 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                  <Globe className="size-5 text-white" />
                </div>
                <h2 className="font-black text-xl tracking-tighter">Global Hub</h2>
              </div>
              <p className="text-sm opacity-90 leading-relaxed font-medium">
                Connect, collaborate, and solve coding challenges in real-time with developers worldwide.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl border border-base-300 flex-1 overflow-hidden">
            <div className="card-body p-6 flex flex-col h-full">
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-40 mb-5 flex items-center gap-2">
                <Sparkles className="size-3 text-primary" /> Rules of Engagement
              </h3>
              <div className="space-y-5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {[
                  ["01", "Be Solution-Oriented.", "Aim to help others overcome their blocks."],
                  ["02", "Share Snippets.", "Use clear code formatting when asking for help."],
                  ["03", "Respect Privacy.", "Don't share sensitive keys or credentials."],
                ].map(([num, title, desc]) => (
                  <div key={num} className="flex gap-3">
                    <div className="size-7 rounded-lg bg-base-200 flex items-center justify-center font-black text-[10px] shrink-0">
                      {num}
                    </div>
                    <p className="text-xs opacity-70 leading-relaxed">
                      <span className="text-base-content font-bold">{title}</span> {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTRE: STREAM CHAT ── */}
        <div className="flex-1 flex flex-col bg-base-100 shadow-2xl lg:rounded-3xl border border-base-300 overflow-hidden arena-stream-theme">
          {chatClient && channel && (
            <Chat client={chatClient} theme="str-chat__theme-dark">
              <Channel channel={channel}>
                <div className="flex flex-1 overflow-hidden">
                  <Window>
                    <MessageList />
                    <MessageComposer />
                  </Window>
                </div>
              </Channel>
            </Chat>
          )}
        </div>

        {/* ── RIGHT SIDEBAR: Active Users ── */}
        {chatClient && <ActiveUsersSidebar chatClient={chatClient} />}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .arena-stream-theme { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .arena-stream-theme .str-chat { flex: 1; overflow: hidden; }
        .arena-stream-theme .str-chat__channel { display: flex; flex-direction: column; height: 100%; }
        .arena-stream-theme .str-chat__main-panel { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .arena-stream-theme .str-chat__ul { background: oklch(var(--b1)) !important; }
        .arena-stream-theme .str-chat__message-input { background: oklch(var(--b1)) !important; border-top: 1px solid oklch(var(--b2)) !important; }
        .arena-stream-theme .str-chat__message-bubble { border-radius: 1.25rem !important; }
        .arena-stream-theme .str-chat__message-simple--own .str-chat__message-bubble {
           border-bottom-right-radius: 0.25rem !important;
           background-color: oklch(var(--p)) !important;
        }
        .arena-stream-theme .str-chat__message-simple:not(.str-chat__message-simple--own) .str-chat__message-bubble {
           border-bottom-left-radius: 0.25rem !important;
           background-color: oklch(var(--b2)) !important;
        }
      `}} />
    </div>
  );
}

export default CommunityPage;
