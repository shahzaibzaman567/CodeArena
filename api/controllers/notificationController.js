import Notification from "../models/Notification.js";

export async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find()
      .populate("createdBy", "name email profileImage")
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ notifications });
  } catch (err) {
    console.error("Error in getNotifications:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function createNotification(req, res) {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notification = await Notification.create({
      title,
      message,
      createdBy: req.user._id
    });

    // Populate createdBy
    await notification.populate("createdBy", "name email profileImage");

    res.status(201).json({ notification });
  } catch (err) {
    console.error("Error in createNotification:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Error in deleteNotification:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function updateNotification(req, res) {
  try {
    const { id } = req.params;
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { title, message },
      { new: true }
    ).populate("createdBy", "name email profileImage");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ notification });
  } catch (err) {
    console.error("Error in updateNotification:", err.message);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
