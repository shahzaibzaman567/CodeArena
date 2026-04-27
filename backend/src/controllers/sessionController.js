import Session from "../models/Session.js";
import User from "../models/User.js";
import { chatClient, streamClient } from "../lib/stream.js";
import { clerkClient } from "@clerk/express";
export async function createSession(req, res) {
    let session;

    try {
        // Feature 1: Accept description, maxParticipants, invitedUsers, problemId
        const { problem, difficulty, description, maxParticipants, invitedEmails, problemId } = req.body;
        const userId = req.user._id;
        const clerkId = req.user.clerkId;

        if (!problem || !difficulty) {
            return res
                .status(400)
                .json({ message: "Problem and difficulty are required" });
        }
        const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Build invited users array
        const invitedUsers = (invitedEmails || []).map(email => ({
            email,
            status: "pending"
        }));
        
        //create session with new fields
        session = await Session.create({
            problem,
            problemId: problemId || null,
            difficulty,
            host: userId,
            callId,
            description: description || "",
            maxParticipants: maxParticipants || 1,
            invitedUsers
        });
        //create stream video call
        const call = streamClient.video.call("default", callId);
        await call.getOrCreate({
            data: {
                created_by_id: clerkId,
                members: [{ user_id: clerkId, role: "admin" }],
                custom: { problem, difficulty, sessionId: session._id.toString() },
            },
        });
        // Chat Messaging

        const channel = chatClient.channel("messaging", callId, {
            name: `${problem} Session`,
            created_by_id: clerkId,
            members: [{ user_id: clerkId }],
        });

        await channel.create();
        res.status(201).json({ session });
    } catch (err) {
        console.error("Error in create session controller:", err);

        if (session?._id) {
            try {
                await Session.findByIdAndDelete(session._id);
            } catch (cleanupErr) {
                console.error("Failed to rollback session after create failure:", cleanupErr.message);
            }
        }

        const streamFailure =
            typeof err.message === "string" &&
            (err.message.includes("GetOrCreateCall failed") ||
                err.message.includes("timeout") ||
                err.message.includes("api_key not found") ||
                err.message.includes("Stream error"));

        res.status(500).json({
            message: streamFailure
                ? "Stream service is not configured correctly"
                : "Internal Server Error",
            error: err.message,
        });
    }
}

export async function getActiveSession(_, res) {
    try {
        const sessions = await Session.find({ status: "active" })
            .populate("host", "name profileImage email clerkId")
            .populate("participant", "name profileImage email clerkId")
            .sort({ createdAt: -1 })
            .limit(20);
        res.status(200).json({ sessions });
    } catch (err) {
        res.json({ message: "Internal Server Error", err }).status(500);
    }
}

export async function getMyRecentSession(req, res) {
    try {
        const userId = req.user._id;
        // get session where user is either host or participant
        const sessions = await Session.find({
            status: "completed",
            $or: [{ host: userId }, { participant: userId }],
        })
            .populate("host", "name profileImage email clerkId")
            .populate("participant", "name profileImage email clerkId")
            .sort({ createdAt: -1 })
            .limit(20);
        res.status(200).json({ sessions });
    } catch (err) {
        console.error("Error in getMyRecentSession:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

export async function getSessionById(req, res) {
    try {
        const { id } = req.params;
        const clerkId = req.user.clerkId;
        
        // 🛡️ Senior Dev: Flexible lookup (Supports both MongoDB ID and Stream callId)
        let session;
        const mongoose = (await import("mongoose")).default;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

        if (isValidObjectId) {
            session = await Session.findById(id)
                .populate("host", "name email profileImage clerkId")
                .populate("participant", "name email profileImage clerkId");
        }

        if (!session) {
            session = await Session.findOne({ callId: id })
                .populate("host", "name email profileImage clerkId")
                .populate("participant", "name email profileImage clerkId");
        }

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // 🛡️ Senior Dev Fix: Ensure permissions on Every Fetch
        // If the user is the host or the assigned participant, make sure they are in the Stream channel/call
        const isHost = session.host.clerkId === clerkId;
        const isParticipant = session.participant?.clerkId === clerkId;

        if (isHost || isParticipant) {
            try {
                // Ensure membership in Video Call
                const call = streamClient.video.call("default", session.callId);
                await call.updateCallMembers({
                    update_members: [{ user_id: clerkId, role: isHost ? "admin" : "user" }]
                });

                // Ensure membership in Chat Channel
                const channel = chatClient.channel("messaging", session.callId);
                await channel.addMembers([clerkId]);
            } catch (streamErr) {
                console.warn("Stream membership sync warning:", streamErr.message);
            }
        }

        res.status(200).json({ session });
    } catch (err) {
        console.error("Error in getSessionById controller :", err.message);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

export async function joinSession(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const clerkId = req.user.clerkId;
        
        // 🛡️ Senior Dev: Flexible lookup (Supports both MongoDB ID and Stream callId)
        let session;
        const mongoose = (await import("mongoose")).default;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

        if (isValidObjectId) {
            session = await Session.findById(id);
        }

        if (!session) {
            session = await Session.findOne({ callId: id });
        }

        if (!session) return res.status(404).json({ message: "Session not found" });
        
        // Feature 1: Check capacity based on maxParticipants
        const participantCount = session.participant ? 1 : 0;
        if (participantCount >= session.maxParticipants) {
            return res.status(409).json({ 
                message: `Session is full. Maximum ${session.maxParticipants} participant(s) allowed.` 
            });
        }
        
        if(session.status !== "active"){
            return res.status(400).json({message:"Cannot join a completed session"})
        }
        
        if(session.host.toString() === userId.toString()){
            return res.status(400).json({message:"Host cannot join their own session as participant"})
        }
        
        session.participant = userId;
        await session.save();

        const call = streamClient.video.call("default", session.callId);
        await call.updateCallMembers({
            update_members: [{ user_id: clerkId, role: "user" }]
        });

        const channel = chatClient.channel("messaging", session.callId);
        await channel.addMembers([clerkId]);
        res.status(200).json({ session });
    } catch (err) {
        console.error("Error in joinSession Controller controller :", err.message);
        res.json({ message: "Internal Server Error", err }).status(500);
    }
}

export async function endSession(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // 🛡️ Senior Dev Fix: Support both MongoDB ID and callId (like getSessionById)
        let session;
        const mongoose = (await import("mongoose")).default;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

        if (isValidObjectId) {
            session = await Session.findById(id);
        }

        if (!session) {
            session = await Session.findOne({ callId: id });
        }

        if (!session) return res.status(404).json({ message: "Session not found" });

        //check if user is the host
        if (session.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Only the host can end the session" });
        }

        // delete stream video call
        const call = streamClient.video.call("default", session.callId);
        await call.delete({ hard: true });

        //delete stream chat channel
        const channel = chatClient.channel("messaging", session.callId);
        await channel.delete();

        //mark session as completed
        session.status = "completed";
        await session.save();

        res.status(200).json({ session, message: "Session ended successfully" });
    } catch (err) {
        console.error("Error in endSession controller:", err.message);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

// Feature 1: Search sessions by name/problem and description
export async function searchSessions(req, res) {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: "Query parameter is required" });
        }
        
        const sessions = await Session.find({
            status: "active",
            $or: [
                { problem: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ]
        })
            .populate("host", "name profileImage email")
            .sort({ createdAt: -1 });
        
        res.status(200).json({ sessions });
    } catch (err) {
        console.error("Error in searchSessions:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

export async function deleteSession(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // 🛡️ Senior Dev Fix: Support both MongoDB ID and callId (consistent with other functions)
        let session;
        const mongoose = (await import("mongoose")).default;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

        if (isValidObjectId) {
            session = await Session.findById(id);
        }

        if (!session) {
            session = await Session.findOne({ callId: id });
        }

        if (!session) return res.status(404).json({ message: "Session not found" });

        if (session.host.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Only the host can delete this session" });
        }

        await Session.findByIdAndDelete(session._id);
        res.status(200).json({ message: "Session deleted successfully" });
    } catch (err) {
        console.error("Error in deleteSession:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

export async function checkUserByEmail(req, res) {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: "Email is required" });
        
        const user = await User.findOne({ email }).select("name email profileImage");
        if (!user) return res.status(404).json({ message: "User not found" });
        
        res.status(200).json({ user });
    } catch (err) {
        console.error("Error in checkUserByEmail:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}

export async function updateSession(req, res) {
    try {
        const { id } = req.params;
        const { isChallengeMode, problem, description, difficulty, languageCodeMap } = req.body;
        const userId = req.user._id;
        
        // 🛡️ Senior Dev Fix: Support both MongoDB ID and callId (like getSessionById)
        let session;
        const mongoose = (await import("mongoose")).default;
        const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

        if (isValidObjectId) {
            session = await Session.findById(id);
        }

        if (!session) {
            session = await Session.findOne({ callId: id });
        }

        if (!session) return res.status(404).json({ message: "Session not found" });
        
        // 🛡️ Senior Dev Fix: Allow BOTH host and participant to update (only host can change other fields)
        const isHost = session.host.toString() === userId.toString();
        const isParticipant = session.participant?.toString() === userId.toString();
        
        if (!isHost && !isParticipant) {
            return res.status(403).json({ message: "Only session participants can update" });
        }
        
        // Only host can change these fields
        if (isHost) {
            if (isChallengeMode !== undefined) session.isChallengeMode = isChallengeMode;
            if (problem) session.problem = problem;
            if (description !== undefined) session.description = description;
            if (difficulty) session.difficulty = difficulty;
        }
        
        // 🛡️ Senior Dev Fix: Both host and participant can update code
        if (languageCodeMap) {
            // Clear existing map and set new values
            session.languageCodeMap = new Map();
            Object.entries(languageCodeMap).forEach(([lang, code]) => {
                session.languageCodeMap.set(lang, code);
            });
        }
        
        await session.save();
        res.status(200).json({ session, message: "Session updated successfully" });
    } catch (err) {
        console.error("Error in updateSession:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
}
