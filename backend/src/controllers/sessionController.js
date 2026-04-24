import Session from "../models/Session.js";
import { chatClient, streamClient } from "../lib/stream.js";
import { clerkClient } from "@clerk/express";
export async function createSession(req, res) {
    let session;

    try {
        const { problem, difficulty } = req.body;
        const userId = req.user._id;
        const clerkId = req.user.clerkId;

        if (!problem || !difficulty) {
            return res
                .status(400)
                .json({ message: "Problem and difficulty are required" });
        }
        // generate a unique stream call id
        const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        //create session in db
        session = await Session.create({
            problem,
            difficulty,
            host: userId,
            callId,
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
        const session = await Session.findById(id)
            .populate("host", "name email profileImage clerkId")
            .populate("participant", "name email profileImage clerkId");

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        res.status(200).json({ session });
    } catch (err) {
        console.error("Error in getSessionById controller :", err.message);
        res.json({ message: "Internal Server Error", err }).status(500);
    }
}

export async function joinSession(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const clerkId = req.user.clerkId;
        const session = await Session.findById(id);
        if (!session) return res.status(404).json({ message: "Session not found" });
        
        // check if session is already full - has a participant
        
        if (session.participant) return res.status(409).json({ message: "Session is full" });
        
        if(session.status !== "active"){
            return res.status(400).json({message:"Cannot join a completed session"})
        }
if(session.host.toString() === userId.toString()){
    return res.status(400).json({message:"Host cannot join their own session as participant"})
}
        session.participant = userId;
        
        await session.save();

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
        const session = await Session.findById(id);
        if (!session) return res.status(404).json({ message: "Session Not found" });
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
