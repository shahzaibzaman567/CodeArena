import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpenIcon,
  BookIcon,
  LayoutDashboardIcon,
  SparklesIcon,
  UsersIcon,
  BellIcon,
  ShieldCheckIcon,
  MenuIcon,
  XIcon,
  TrashIcon,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/clerk-react";
import axios from "../lib/axios.js";
import { useAdminAccess } from "../hooks/useAdminAccess.js";
import { useClerkAuthSync } from "../hooks/useClerkAuthSync.js";

function Navbar() {
  const location = useLocation();
  const { user } = useUser();
  const { authTokenReady, isSignedIn } = useClerkAuthSync();
  const { data: adminAccess } = useAdminAccess(isSignedIn && authTokenReady);
  const isAdmin = Boolean(adminAccess?.isAdmin);

  const [menuOpen, setMenuOpen] = useState(false);
  const [hasCommunityNotification, setHasCommunityNotification] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Notification bell state
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef(null);
  const lastSeenRef = useRef(null);

  useEffect(() => {
    const handleNotify = (e) => {
      setHasCommunityNotification(e.detail.hasNew);
    };
    window.addEventListener("arena-community-notify", handleNotify);
    return () => window.removeEventListener("arena-community-notify", handleNotify);
  }, []);

  // Fetch notifications periodically
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const token = window.__clerk_token;
        if (!token) return;
        const res = await axios.get(`/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fetched = res.data.notifications || [];
        setNotifications(fetched);

        // Count unread (newer than last seen timestamp)
        const lastSeen = lastSeenRef.current;
        const unread = lastSeen
          ? fetched.filter((n) => new Date(n.createdAt) > new Date(lastSeen)).length
          : fetched.length;
        setUnreadCount(unread);
      } catch {
        // Silently ignore
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  // Close bell when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellOpen = () => {
    setBellOpen((prev) => !prev);
    if (!bellOpen) {
      // Mark all as read by recording current timestamp
      lastSeenRef.current = new Date().toISOString();
      setUnreadCount(0);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      const token = window.__clerk_token;
      await axios.delete(`/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch {
      // Silently ignore
    }
  };

  const isActive = (path) => location.pathname === path;

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <nav className="bg-base-100/80 backdrop-blur-md border-b border-primary/20 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto p-4 flex items-center justify-between gap-4">
        {/* LOGO */}
        <Link
          to="/"
          className="group flex items-center gap-3 hover:scale-105 transition-transform duration-200"
        >
          <div className="size-10 rounded-xl bg-gradient-to-r from-primary via-secondary to-accent flex items-center justify-center shadow-lg ">
            <SparklesIcon className="size-6 text-white" />
          </div>

          <div className="flex flex-col">
            <span className="font-black text-xl bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-mono tracking-wider">
              Codearena
            </span>
            <span className="text-xs text-base-content/60 font-medium -mt-1">Code Together</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMenu}
            className="sm:hidden btn btn-square btn-ghost"
            aria-label="Toggle navigation"
          >
            {menuOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>

          <div className="hidden sm:flex items-center gap-1">
            {/* PROBLEMS PAGE LINK */}
            <Link
              to={"/problems"}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 
                ${
                  isActive("/problems")
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
                }
                `}
            >
              <div className="flex items-center gap-x-2.5">
                <BookOpenIcon className="size-4" />
                <span className="font-medium hidden sm:inline">Problems</span>
              </div>
            </Link>

            {/* BOOKS PAGE LINK */}
            <Link
              to={"/books"}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 
                ${
                  isActive("/books")
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
                }
                `}
            >
              <div className="flex items-center gap-x-2.5">
                <BookIcon className="size-4" />
                <span className="font-medium hidden sm:inline">Books</span>
              </div>
            </Link>

            {/* COMMUNITY PAGE LINK */}
            <Link
              to={"/community"}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 relative
                ${
                  isActive("/community")
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
                }
                `}
            >
              <div className="flex items-center gap-x-2.5">
                <UsersIcon className="size-4" />
                <span className="font-medium hidden sm:inline">Arena Community</span>
              </div>
              {hasCommunityNotification && !isActive("/community") && (
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
                </span>
              )}
            </Link>

            {/* DASHBOARD PAGE LINK */}
            <Link
              to={"/dashboard"}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 
                ${
                  isActive("/dashboard")
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
                }
                `}
            >
              <div className="flex items-center gap-x-2.5">
                <LayoutDashboardIcon className="size-4" />
                <span className="font-medium hidden sm:inline">Dashboard</span>
              </div>
            </Link>

            {isAdmin && (
              <Link
                to={"/admin"}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-2.5 rounded-lg transition-all duration-200 
                  ${
                    isActive("/admin")
                      ? "bg-warning text-warning-content"
                      : "hover:bg-warning/10 text-warning hover:text-warning"
                  }
                  `}
              >
                <div className="flex items-center gap-x-2.5">
                  <ShieldCheckIcon className="size-4" />
                  <span className="font-medium hidden sm:inline">Admin</span>
                </div>
              </Link>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {/* NOTIFICATION BELL */}
            <div className="relative ml-1" ref={bellRef}>
              <button
                id="notification-bell-btn"
                onClick={handleBellOpen}
                className="relative p-2.5 rounded-lg hover:bg-base-200 transition-all duration-200 text-base-content/70 hover:text-base-content"
                aria-label="Notifications"
              >
                <BellIcon className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white text-[10px] font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {bellOpen && (
                <div
                  id="notification-dropdown"
                  className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border border-base-300 bg-base-100 z-[100] overflow-hidden"
                  style={{ maxHeight: "420px" }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-200">
                    <span className="font-bold text-sm text-base-content">Announcements</span>
                    <button
                      onClick={() => setBellOpen(false)}
                      className="text-base-content/50 hover:text-base-content transition-colors"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <BellIcon className="size-8 text-base-content/20 mb-2" />
                        <p className="text-sm text-base-content/50">No announcements yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className="px-4 py-3 border-b border-base-200 hover:bg-base-200 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-base-content truncate">{notif.title}</p>
                              <p className="text-xs text-base-content/60 mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-[10px] text-base-content/40 mt-1">
                                {new Date(notif.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteNotification(notif._id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-error hover:bg-error/10 rounded transition-all"
                                title="Delete"
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ml-2 flex items-center">
              <UserButton signOutUrl="/" />
            </div>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-base-200 bg-base-100 px-4 pb-4">
          <div className="flex flex-col gap-2 pt-4">
            <Link
              to="/problems"
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive("/problems")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/80"
              }`}
            >
              Problems
            </Link>
            <Link
              to="/books"
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive("/books")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/80"
              }`}
            >
              Books
            </Link>
            <Link
              to="/community"
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive("/community")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/80"
              }`}
            >
              Arena Community
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive("/dashboard")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/80"
              }`}
            >
              Dashboard
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive("/admin")
                    ? "bg-warning text-warning-content"
                    : "hover:bg-warning/10 text-warning"
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
export default Navbar;
