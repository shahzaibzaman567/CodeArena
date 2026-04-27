import CommunityMessage from "../models/CommunityMessage.js";

export const getCommunityMessages = async (req, res) => {
  try {
    const messages = await CommunityMessage.find()
      .populate("user", "name email clerkId profileImage")
      .populate("replies.user", "name email clerkId profileImage")
      .sort({ createdAt: -1 });
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
};

export const createCommunityMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });

    const message = new CommunityMessage({
      content,
      user: req.user._id,
    });

    await message.save();
    const populatedMessage = await message.populate("user", "name email clerkId profileImage");
    
    res.status(201).json({ message: "Post created", post: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: "Failed to create post", error: error.message });
  }
};

export const replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Reply content is required" });

    const message = await CommunityMessage.findById(messageId);
    if (!message) return res.status(404).json({ message: "Post not found" });

    message.replies.push({
      content,
      user: req.user._id,
    });

    await message.save();
    const updatedMessage = await CommunityMessage.findById(messageId)
      .populate("user", "name email clerkId profileImage")
      .populate("replies.user", "name email clerkId profileImage");

    res.status(200).json({ message: "Reply added", post: updatedMessage });
  } catch (error) {
    res.status(500).json({ message: "Failed to add reply", error: error.message });
  }
};

export const deleteCommunityMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await CommunityMessage.findById(messageId);

    if (!message) return res.status(404).json({ message: "Post not found" });

    // Only allow deletion if the user is the owner
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this post" });
    }

    await CommunityMessage.findByIdAndDelete(messageId);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete post", error: error.message });
  }
};

