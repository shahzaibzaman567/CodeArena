import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "../lib/axios.js";
import {
  ShieldCheckIcon,
  UsersIcon,
  ActivityIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  SearchIcon,
  BellPlusIcon,
  SendIcon,
  TrashIcon,
  XIcon,
  LoaderIcon,
  UserIcon,
  BarChart3Icon,
  ZapIcon,
  PlusIcon,
  PencilIcon,
  BookOpenIcon,
  Star,
  DatabaseIcon,
} from "lucide-react";
import { gsap } from "gsap";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar.jsx";
import { useAdminAccess } from "../hooks/useAdminAccess.js";

// ─── SVG Sparkline Chart ──────────────────────────────────────────────────────
function SparklineChart({ data = [], color = "#6366f1", label = "" }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 1120;
  const height = 420;
  const padX = 72;
  const padY = 44;

  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2);
    const y = padY + (1 - d.count / max) * (height - padY * 2);
    return { x, y, ...d };
  });

  const pathD =
    points.length > 1
      ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
      : "";

  const fillD =
    points.length > 1
      ? `M ${points[0].x},${height - padY} L ${points
          .map((p) => `${p.x},${p.y}`)
          .join(" L ")} L ${points[points.length - 1].x},${height - padY} Z`
      : "";

  const [hovered, setHovered] = useState(null);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[820px]"
        style={{ minHeight: 360 }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
          <line
            key={i}
            x1={padX}
            x2={width - padX}
            y1={padY + frac * (height - padY * 2)}
            y2={padY + frac * (height - padY * 2)}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        ))}

        {fillD && <path d={fillD} fill={`url(#grad-${label})`} />}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHovered(p)}>
            <circle cx={p.x} cy={p.y} r="8" fill={color} opacity="0.92" />
            <circle cx={p.x} cy={p.y} r="22" fill="transparent" />
          </g>
        ))}

        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 10}
            textAnchor="middle"
            fontSize="14"
            fill="currentColor"
            opacity="0.4"
          >
            {p.label}
          </text>
        ))}

        {hovered && (
          <g>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={padY}
              y2={height - padY}
              stroke={color}
              strokeOpacity="0.25"
              strokeDasharray="8 8"
            />
            <rect
              x={Math.min(Math.max(hovered.x - 74, 16), width - 148)}
              y={Math.max(hovered.y - 78, 18)}
              width="148"
              height="54"
              rx="10"
              fill="#1e293b"
              opacity="0.95"
            />
            <text
              x={Math.min(Math.max(hovered.x - 74, 16), width - 148) + 74}
              y={Math.max(hovered.y - 78, 18) + 22}
              textAnchor="middle"
              fontSize="12"
              fill="#cbd5e1"
              fontWeight="700"
            >
              {hovered.label}
            </text>
            <text
              x={Math.min(Math.max(hovered.x - 74, 16), width - 148) + 74}
              y={Math.max(hovered.y - 78, 18) + 40}
              textAnchor="middle"
              fontSize="16"
              fill={color}
              fontWeight="700"
            >
              {hovered.count} session{hovered.count === 1 ? "" : "s"}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div
      className="rounded-2xl p-5 border flex flex-col gap-3 shadow-lg transition-transform hover:-translate-y-0.5"
      style={{
        background: "rgba(15,23,42,0.7)",
        borderColor: color + "33",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest opacity-60">
          {label}
        </span>
        <div className="p-2 rounded-xl" style={{ background: color + "22" }}>
          <Icon className="size-4" style={{ color }} />
        </div>
      </div>
      <div className="text-4xl font-black tabular-nums" style={{ color }}>
        {value ?? "—"}
      </div>
      {sub && (
        <span className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Inline Star Rating Picker ─────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`size-6 transition-colors ${
              star <= (hover || value)
                ? "text-amber-400 fill-amber-400"
                : "text-white/20"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { data: adminAccess, isLoading: loadingAdminAccess } = useAdminAccess(isLoaded);

  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [booksList, setBooksList] = useState([]);
  const [bookTitle, setBookTitle] = useState("");
  const [bookThumbnailUrl, setBookThumbnailUrl] = useState("");
  const [bookPdfUrl, setBookPdfUrl] = useState("");
  const [bookRating, setBookRating] = useState(4);
  const [editingBook, setEditingBook] = useState(null);
  const [savingBook, setSavingBook] = useState(false);
  const [editingNotif, setEditingNotif] = useState(null);
  const [roleSavingId, setRoleSavingId] = useState(null);
  const containerRef = useRef(null);

  const isAdmin = Boolean(adminAccess?.isAdmin);

  // Redirect non-admins
  useEffect(() => {
    if (isLoaded && !loadingAdminAccess && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoaded, loadingAdminAccess, isAdmin, navigate]);

  // Poll all data every 15 seconds
  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // GSAP stagger entry animation
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current.querySelectorAll(".gsap-card"),
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, stagger: 0.07, duration: 0.55, ease: "power2.out" }
    );
  }, [activeTab, stats]);

  const getToken = () => window.__clerk_token;

  const fetchAll = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [statsRes, usersRes, notifRes, booksRes] = await Promise.all([
        axios.get("/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/notifications", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/books", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStats(statsRes.data.stats);
      setChartData(statsRes.data.chartData || []);
      setUsers(usersRes.data.users || []);
      setNotifications(notifRes.data.notifications || []);
      setBooksList(booksRes.data.books || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleUserRoleChange = async (targetUser, role) => {
    setRoleSavingId(targetUser._id);
    try {
      const token = getToken();
      const res = await axios.patch(
        `/admin/users/${targetUser._id}/role`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((prev) => prev.map((userItem) => (userItem._id === targetUser._id ? res.data.user : userItem)));
      toast.success(
        role === "admin"
          ? `${targetUser.name} is now an admin`
          : `${targetUser.name} is now a regular user`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user role");
    } finally {
      setRoleSavingId(null);
    }
  };

  // ── Notification Actions ───────────────────────────────────────────────────
  const handleSendOrUpdateNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      const token = getToken();
      if (editingNotif) {
        const res = await axios.put(
          `/notifications/${editingNotif._id}`,
          { title: notifTitle.trim(), message: notifMessage.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotifications((prev) =>
          prev.map((n) => (n._id === editingNotif._id ? res.data.notification : n))
        );
        toast.success("Announcement updated!");
        handleCancelEditNotification();
      } else {
        const res = await axios.post(
          `/notifications`,
          { title: notifTitle.trim(), message: notifMessage.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotifications((prev) => [res.data.notification, ...prev]);
        setNotifTitle("");
        setNotifMessage("");
        toast.success("📣 Announcement broadcast to all users!");
      }
    } catch {
      toast.error(editingNotif ? "Failed to update announcement" : "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  const handleStartEditNotification = (notif) => {
    setEditingNotif(notif);
    setNotifTitle(notif.title);
    setNotifMessage(notif.message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEditNotification = () => {
    setEditingNotif(null);
    setNotifTitle("");
    setNotifMessage("");
  };

  const handleDeleteNotification = async (id) => {
    try {
      const token = getToken();
      await axios.delete(`/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Announcement deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ── Book Actions ──────────────────────────────────────────────────────────
  const handleCreateOrUpdateBook = async () => {
    if (!bookTitle.trim() || !bookThumbnailUrl.trim() || !bookPdfUrl.trim()) {
      toast.error("Title, Thumbnail URL, and PDF URL are required");
      return;
    }
    setSavingBook(true);
    try {
      const token = getToken();
      if (editingBook) {
        const res = await axios.put(
          `/books/${editingBook._id}`,
          {
            title: bookTitle.trim(),
            thumbnailUrl: bookThumbnailUrl.trim(),
            pdfUrl: bookPdfUrl.trim(),
            rating: Number(bookRating),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setBooksList((prev) =>
          prev.map((b) => (b._id === editingBook._id ? res.data.book : b))
        );
        toast.success("Book updated!");
      } else {
        const res = await axios.post(
          `/books`,
          {
            title: bookTitle.trim(),
            thumbnailUrl: bookThumbnailUrl.trim(),
            pdfUrl: bookPdfUrl.trim(),
            rating: Number(bookRating),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setBooksList((prev) => [res.data.book, ...prev]);
        toast.success("Book added to library!");
      }
      handleCancelBookEdit();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save book");
    } finally {
      setSavingBook(false);
    }
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm("Delete this book from the library?")) return;
    try {
      const token = getToken();
      await axios.delete(`/books/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBooksList((prev) => prev.filter((b) => b._id !== id));
      toast.success("Book removed from library");
    } catch {
      toast.error("Failed to delete book");
    }
  };

  const handleSeedBooks = async () => {
    try {
      const token = getToken();
      if (!token) return;
      toast.loading("Seeding library catalog...", { id: "seed" });
      await axios.post(`/books/seed`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Library seeded!", { id: "seed" });
      const res = await axios.get(`/books`, { headers: { Authorization: `Bearer ${token}` } });
      setBooksList(res.data.books || []);
    } catch {
      toast.dismiss("seed");
      toast.error("Failed to seed books");
    }
  };

  const handleStartBookEdit = (book) => {
    setEditingBook(book);
    setBookTitle(book.title);
    setBookThumbnailUrl(book.thumbnailUrl);
    setBookPdfUrl(book.pdfUrl);
    setBookRating(book.rating);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelBookEdit = () => {
    setEditingBook(null);
    setBookTitle("");
    setBookThumbnailUrl("");
    setBookPdfUrl("");
    setBookRating(4);
  };

  if (!isLoaded || loadingAdminAccess || !isAdmin) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3Icon },
    { id: "users", label: "Users", icon: UsersIcon },
    { id: "broadcast", label: "Broadcast", icon: BellPlusIcon },
    { id: "books", label: "Books", icon: BookOpenIcon },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1526 40%, #0a1220 100%)",
      }}
    >
      {/* ── Main Site Navbar (has UserButton + all nav links) ── */}
      <Navbar />

      {/* ── Admin Panel Header ── */}
      <div
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{
          background: "rgba(10,15,30,0.85)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(99,102,241,0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
          >
            <ShieldCheckIcon className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Admin Panel</h1>
            <p className="text-xs opacity-40 text-white">CodeArena Control Centre</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <img
            src={user?.imageUrl}
            alt={user?.fullName}
            className="size-8 rounded-full ring-2 ring-violet-500"
          />
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white leading-none">{user?.fullName}</p>
            <p className="text-[10px] text-violet-400 mt-0.5">Administrator</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" ref={containerRef}>
        {/* ── Tab Navigation ── */}
        <div
          className="flex flex-wrap gap-2 mb-8 p-1 rounded-xl w-fit"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                style={
                  active
                    ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff" }
                    : { color: "rgba(255,255,255,0.45)" }
                }
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ══════════ OVERVIEW TAB ══════════ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: UsersIcon, label: "Total Users", value: stats?.totalUsers, color: "#6366f1", sub: "Registered on platform" },
                { icon: ZapIcon, label: "Active Sessions", value: stats?.activeSessions, color: "#22c55e", sub: "Currently live" },
                { icon: CheckCircleIcon, label: "Completed", value: stats?.completedSessions, color: "#f59e0b", sub: "All-time finished sessions" },
                { icon: ActivityIcon, label: "Active Users ~", value: stats?.activeUsersApprox, color: "#06b6d4", sub: "Approx. online now (5 min)" },
              ].map((card, i) => (
                <div key={i} className="gsap-card">
                  <StatCard {...card} />
                </div>
              ))}
            </div>

            {/* Today vs Yesterday */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "New Users Today", value: stats?.usersToday, color: "#a78bfa" },
                { label: "New Users Yesterday", value: stats?.usersYesterday, color: "#34d399" },
              ].map((card, i) => (
                <div
                  key={i}
                  className="gsap-card rounded-2xl p-5 border flex items-center gap-5 shadow-lg"
                  style={{
                    background: "rgba(15,23,42,0.7)",
                    borderColor: card.color + "33",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="text-5xl font-black tabular-nums" style={{ color: card.color }}>
                    {card.value ?? 0}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{card.label}</p>
                    <p className="text-xs opacity-40 text-white mt-0.5">
                      {i === 0
                        ? (card.value > (stats?.usersYesterday ?? 0) ? "📈 Up from yesterday" : "📉 Down from yesterday")
                        : "Previous day count"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div
              className="gsap-card rounded-2xl p-6 border shadow-xl"
              style={{
                background: "rgba(15,23,42,0.75)",
                borderColor: "rgba(99,102,241,0.2)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUpIcon className="size-5 text-violet-400" />
                <h2 className="font-bold text-white text-base">Sessions Created — Last 7 Days</h2>
              </div>
              <SparklineChart data={chartData} color="#6366f1" label="sessions" />
            </div>
          </div>
        )}

        {/* ══════════ USERS TAB ══════════ */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div
              className="gsap-card flex items-center gap-3 px-4 py-3 rounded-2xl border"
              style={{ background: "rgba(15,23,42,0.7)", borderColor: "rgba(99,102,241,0.2)" }}
            >
              <SearchIcon className="size-4 text-violet-400 shrink-0" />
              <input
                id="admin-user-search"
                type="text"
                placeholder="Search users by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-transparent flex-1 outline-none text-white text-sm placeholder:text-white/30"
              />
              {userSearch && (
                <button onClick={() => setUserSearch("")}>
                  <XIcon className="size-4 text-white/40 hover:text-white/70" />
                </button>
              )}
            </div>

            <p className="text-xs text-white/30 px-1">
              Showing {filteredUsers.length} of {users.length} users
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => (
                <div
                  key={u._id}
                  className="gsap-card rounded-2xl p-4 border flex items-center gap-4 transition-transform hover:-translate-y-0.5 shadow-lg"
                  style={{
                    background: "rgba(15,23,42,0.75)",
                    borderColor: u.role === "admin" ? "rgba(245,158,11,0.4)" : "rgba(99,102,241,0.15)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {u.profileImage ? (
                    <img
                      src={u.profileImage}
                      alt={u.name}
                      className="size-12 rounded-full ring-2 ring-violet-500/60"
                    />
                  ) : (
                    <div
                      className="size-12 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.2)" }}
                    >
                      <UserIcon className="size-5 text-violet-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">{u.name}</p>
                      {u.role === "admin" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 truncate mt-0.5">{u.email}</p>
                    <p className="text-[10px] text-white/25 mt-1">
                      Joined{" "}
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <div className="mt-3">
                      {u._id === adminAccess?.user?._id ? (
                        <span className="text-[10px] text-white/35 uppercase tracking-widest">
                          Current admin account
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUserRoleChange(u, u.role === "admin" ? "user" : "admin")}
                          disabled={roleSavingId === u._id}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                          style={{
                            background:
                              u.role === "admin"
                                ? "rgba(220,38,38,0.16)"
                                : "rgba(34,197,94,0.16)",
                            color: u.role === "admin" ? "#fca5a5" : "#86efac",
                            border:
                              u.role === "admin"
                                ? "1px solid rgba(239,68,68,0.25)"
                                : "1px solid rgba(34,197,94,0.25)",
                          }}
                        >
                          {roleSavingId === u._id
                            ? "Saving..."
                            : u.role === "admin"
                            ? "Remove Admin"
                            : "Make Admin"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="col-span-full text-center py-14">
                  <UsersIcon className="size-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ BROADCAST TAB ══════════ */}
        {activeTab === "broadcast" && (
          <div className="space-y-6 max-w-2xl">
            {/* Compose / Edit Form */}
            <div
              className="gsap-card rounded-2xl p-6 border shadow-xl space-y-4"
              style={{
                background: "rgba(15,23,42,0.75)",
                borderColor: editingNotif ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.25)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {editingNotif ? (
                    <PencilIcon className="size-5 text-amber-400" />
                  ) : (
                    <BellPlusIcon className="size-5 text-violet-400" />
                  )}
                  <h2 className="font-bold text-white">
                    {editingNotif ? "Edit Announcement" : "Broadcast Announcement"}
                  </h2>
                </div>
                {editingNotif && (
                  <button
                    onClick={handleCancelEditNotification}
                    className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    <XIcon className="size-3.5" />
                    Cancel Edit
                  </button>
                )}
              </div>

              {editingNotif && (
                <div className="text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                  ✏️ Editing: <span className="font-semibold text-amber-300">{editingNotif.title}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-1.5 block">
                  Title
                </label>
                <input
                  id="notif-title"
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. New feature launched!"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(99,102,241,0.25)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = editingNotif ? "#f59e0b" : "#6366f1")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.25)")}
                />
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-1.5 block">
                  Message
                </label>
                <textarea
                  id="notif-message"
                  rows={4}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Write your announcement here…"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(99,102,241,0.25)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = editingNotif ? "#f59e0b" : "#6366f1")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.25)")}
                />
              </div>

              <div className="flex gap-3">
                <button
                  id="send-announcement-btn"
                  onClick={handleSendOrUpdateNotification}
                  disabled={sending}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: editingNotif
                      ? "linear-gradient(135deg,#d97706,#b45309)"
                      : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  }}
                >
                  {sending ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : editingNotif ? (
                    <PencilIcon className="size-4" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                  {sending
                    ? "Saving…"
                    : editingNotif
                    ? "Update Announcement"
                    : "Broadcast to All Users"}
                </button>
                {editingNotif && (
                  <button
                    onClick={handleCancelEditNotification}
                    className="px-5 py-3 rounded-xl font-semibold text-sm text-white/50 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Past Announcements */}
            <div>
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">
                Past Announcements ({notifications.length})
              </h3>
              <div className="space-y-3">
                {notifications.length === 0 && (
                  <p className="text-white/25 text-sm">No announcements yet.</p>
                )}
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className="gsap-card rounded-xl px-5 py-4 border flex items-start justify-between gap-4 group"
                    style={{
                      background:
                        editingNotif?._id === n._id
                          ? "rgba(217,119,6,0.08)"
                          : "rgba(15,23,42,0.7)",
                      borderColor:
                        editingNotif?._id === n._id
                          ? "rgba(245,158,11,0.35)"
                          : "rgba(99,102,241,0.15)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{n.title}</p>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-white/25 mt-1">
                        {new Date(n.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => handleStartEditNotification(n)}
                        className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                        title="Edit"
                      >
                        <PencilIcon className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNotification(n._id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ BOOKS TAB ══════════ */}
        {activeTab === "books" && (
          <div className="space-y-8">
            {/* Add / Edit Form */}
            <div
              className="gsap-card rounded-2xl p-6 border shadow-xl"
              style={{
                background: "rgba(15,23,42,0.75)",
                borderColor: editingBook ? "rgba(245,158,11,0.3)" : "rgba(99,102,241,0.25)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  {editingBook ? (
                    <PencilIcon className="size-5 text-amber-400" />
                  ) : (
                    <PlusIcon className="size-5 text-violet-400" />
                  )}
                  <h2 className="font-bold text-white">
                    {editingBook ? "Edit Book" : "Add New Book"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {!editingBook && booksList.length === 0 && (
                    <button
                      id="seed-books-btn"
                      onClick={handleSeedBooks}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white/70 hover:text-white transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <DatabaseIcon className="size-4" />
                      Seed Default Books
                    </button>
                  )}
                  {editingBook && (
                    <button
                      onClick={handleCancelBookEdit}
                      className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                      <XIcon className="size-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {editingBook && (
                <div className="text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 mb-4">
                  ✏️ Editing: <span className="font-semibold text-amber-300">{editingBook.title}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-1.5 block">
                    Book Title *
                  </label>
                  <input
                    id="book-title-input"
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder="e.g. The Rust Programming Language"
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(99,102,241,0.25)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.25)")}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-1.5 block">
                    Thumbnail URL *
                  </label>
                  <input
                    id="book-thumbnail-input"
                    type="url"
                    value={bookThumbnailUrl}
                    onChange={(e) => setBookThumbnailUrl(e.target.value)}
                    placeholder="https://... or /image.png"
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(99,102,241,0.25)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.25)")}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-1.5 block">
                    PDF URL *
                  </label>
                  <input
                    id="book-pdf-input"
                    type="url"
                    value={bookPdfUrl}
                    onChange={(e) => setBookPdfUrl(e.target.value)}
                    placeholder="https://... or /Books/filename.pdf"
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(99,102,241,0.25)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.25)")}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-2 block">
                    Star Rating
                  </label>
                  <StarPicker value={bookRating} onChange={setBookRating} />
                </div>

                {bookThumbnailUrl && (
                  <div>
                    <label className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-1.5 block">
                      Thumbnail Preview
                    </label>
                    <img
                      src={bookThumbnailUrl}
                      alt="preview"
                      className="h-24 w-auto rounded-lg object-cover border border-white/10"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  id="save-book-btn"
                  onClick={handleCreateOrUpdateBook}
                  disabled={savingBook}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: editingBook
                      ? "linear-gradient(135deg,#d97706,#b45309)"
                      : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  }}
                >
                  {savingBook ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : editingBook ? (
                    <PencilIcon className="size-4" />
                  ) : (
                    <PlusIcon className="size-4" />
                  )}
                  {savingBook ? "Saving…" : editingBook ? "Update Book" : "Add Book"}
                </button>
                {editingBook && (
                  <button
                    onClick={handleCancelBookEdit}
                    className="px-5 py-3 rounded-xl font-semibold text-sm text-white/50 hover:text-white transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Books Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">
                  Library Catalog ({booksList.length} books)
                </h3>
                {booksList.length > 0 && (
                  <button
                    onClick={handleSeedBooks}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    <DatabaseIcon className="size-3.5" />
                    Re-seed defaults
                  </button>
                )}
              </div>

              {booksList.length === 0 ? (
                <div className="text-center py-20 rounded-2xl border border-dashed border-white/10">
                  <BookOpenIcon className="size-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 text-sm mb-4">No books in the library yet.</p>
                  <button
                    onClick={handleSeedBooks}
                    className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                  >
                    <DatabaseIcon className="size-4" />
                    Seed Default Books
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {booksList.map((book) => (
                    <div
                      key={book._id}
                      className="gsap-card group relative flex flex-col rounded-2xl border overflow-hidden shadow-lg transition-all hover:shadow-violet-900/30"
                      style={{
                        background: "rgba(15,23,42,0.75)",
                        borderColor:
                          editingBook?._id === book._id
                            ? "rgba(245,158,11,0.5)"
                            : "rgba(99,102,241,0.15)",
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-[3/4] w-full bg-slate-950 overflow-hidden">
                        {book.thumbnailUrl ? (
                          <img
                            src={book.thumbnailUrl}
                            alt={book.title}
                            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-violet-900/10">
                            <BookOpenIcon className="size-16 text-violet-400/20" />
                          </div>
                        )}
                        {/* Action overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleStartBookEdit(book)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-white transition-all hover:scale-105"
                            style={{ background: "rgba(217,119,6,0.9)" }}
                            title="Edit book"
                          >
                            <PencilIcon className="size-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book._id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-white transition-all hover:scale-105"
                            style={{ background: "rgba(220,38,38,0.9)" }}
                            title="Delete book"
                          >
                            <TrashIcon className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-4 space-y-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`size-3.5 ${
                                star <= book.rating ? "text-amber-400 fill-amber-400" : "text-white/10"
                              }`}
                            />
                          ))}
                        </div>
                        <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">
                          {book.title}
                        </h3>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleStartBookEdit(book)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-amber-400 transition-all hover:bg-amber-400/10"
                            style={{ border: "1px solid rgba(245,158,11,0.3)" }}
                          >
                            <PencilIcon className="size-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book._id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-red-400 transition-all hover:bg-red-400/10"
                            style={{ border: "1px solid rgba(239,68,68,0.3)" }}
                          >
                            <TrashIcon className="size-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
