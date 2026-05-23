import User from "../models/User.js";
import Session from "../models/Session.js";
import { ENV } from "../lib/env.js";

const ADMIN_EMAIL = ENV.ADMIN_EMAIL;

export async function getAdminAccess(req, res) {
  try {
    const isAdmin = req.user?.role === "admin" || req.user?.email?.toLowerCase() === ADMIN_EMAIL;
    return res.status(200).json({
      isAdmin,
      user: {
        _id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        name: req.user.name,
      },
    });
  } catch (err) {
    console.error("Error in getAdminAccess:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function getAdminStats(req, res) {
  try {
    const totalUsers = await User.countDocuments();
    const activeSessions = await Session.countDocuments({ status: "active" });
    const completedSessions = await Session.countDocuments({ status: "completed" });

    // Calculate users registered today vs yesterday
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const usersToday = await User.countDocuments({
      createdAt: { $gte: todayStart, $lt: tomorrowStart }
    });

    const usersYesterday = await User.countDocuments({
      createdAt: { $gte: yesterdayStart, $lt: todayStart }
    });

    // 7-day session analytics
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push({
        date: d,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        count: 0
      });
    }

    const sessions = await Session.find({
      createdAt: { $gte: last7Days[0].date }
    });

    sessions.forEach(session => {
      const sessionDate = new Date(session.createdAt);
      sessionDate.setHours(0, 0, 0, 0);
      const matchedDay = last7Days.find(day => day.date.getTime() === sessionDate.getTime());
      if (matchedDay) {
        matchedDay.count++;
      }
    });

    // Count users active in the last 5 minutes
    const activeThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsersCount = await User.countDocuments({
      lastActiveAt: { $gte: activeThreshold }
    });
    const activeUsersApprox = Math.max(1, activeUsersCount);

    res.status(200).json({
      stats: {
        totalUsers,
        activeSessions,
        completedSessions,
        usersToday,
        usersYesterday,
        activeUsersApprox
      },
      chartData: last7Days.map(d => ({ label: d.label, count: d.count }))
    });
  } catch (err) {
    console.error("Error in getAdminStats:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function getAdminUsers(req, res) {
  try {
    const { query } = req.query;
    let filter = {};
    if (query) {
      filter = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } }
        ]
      };
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (err) {
    console.error("Error in getAdminUsers:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be either user or admin" });
    }

    if (req.user._id.toString() === id && role !== req.user.role) {
      return res.status(400).json({ message: "You cannot change your own admin role." });
    }

    const updatedUser = await User.findByIdAndUpdate(id, { role }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: updatedUser, message: "User role updated successfully" });
  } catch (err) {
    console.error("Error in updateUserRole:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

// One-time bootstrap: ensure admin email has role="admin" in the DB
export async function bootstrapAdmin(req, res) {
  try {
    const result = await User.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      { role: "admin" },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ message: "Admin user not found in DB. Login first to create your account." });
    }
    res.status(200).json({ message: "Admin role assigned successfully", user: result });
  } catch (err) {
    console.error("Error in bootstrapAdmin:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
