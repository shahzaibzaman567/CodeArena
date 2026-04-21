import Session from "../models/Session.js";
import { chatClient, streamClient } from "../lib/stream.js";
import { clerkClient } from "@clerk/express";
export async function createSession(req, res) {
    try {
        const { probelm, difficulty } = req.body;
        const userId = req.user._id;
        const clerkId = req.user.clerkId;

        if (!probelm || !difficulty) {
            return res
                .status(400)
                .json({ message: "Problem and difficulty are required" });
        }
        // generate a unique stream call id
        const callId = `session_${data.now()}_${Math.random().toString(36).substring(7)}`;
        //create session in db
        const session = await Session.create({
            probelm,
            difficulty,
            host: userId,
            callId,
        });
        //create stream video call
        await streamClient.video.call("deafult", callId).getOrcreate({
            data: {
                created_by_id: clerkId,
                custom: { probelm, difficulty, sessionId: session._id.toString() },
            },
        });
        // Chat Messaging

        const channel = chatClient.channel("messaging", clerkId, {
            name: `${probelm} Session`,
            created_by_id: clerkId,
            members: [clerkId],
        });

        await channel.create();
        res.status(200).json({ session });
    } catch (err) {
        console.error("Error in create session controller");
        res.json({ message: "Internal Server Error", err }).status(500);
    }
}

export async function getActiveSession(_, res) {
    try {
        const sessions = await Session.find({ status: "active" })
            .populate("host", "name profileImage email clerkId")
            .sort({ createdAt: -1 })
            .limit(20);
        res.status(200).json(sessions);
    } catch (err) {
        res.json({ message: "Internal Server Error", err }).status(500);
    }
}

export async function getMyRecentSession(req, res) {
    try {
        const userId = req.user._id;
        // get session where user is either host or participant
        const sessions = await Session.find({
            status: "Completed",
            $or: [{ host: userId }, { participant: userId }],
        })
            .sort({ createAt: -1 })
            .limit(20);
        res.josn({ session }).status(200);
    } catch (err) {
        res.json({ message: "Internal Server Error", err }).status(500);
    }
}

export async function getSessionById(req, res) {
    try {
        const { id } = req.params;
        const session = await Session.findById(id)
            .populate("host", "name email profileImage clerkId")
            .populate("participant", "name email profileImage clerkid");

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
        if (session.participant)
            return res.status(404).json({ message: "Session is full" });
        session.participant = userId;
        await session.save();

        const channel = chatClient.channel("messaging", session.callId);
        await channel.addMembers({ clerkId });
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
        if (session) return res.status({ message: "Session Not found" });
        //check if user is the host
        if (session.host.toString !== userId.toString()) {
            return res.json({ message: "On;ly the can end the session" }).status(403);
        }
        //check if session is already completed
        session.status = "completed";
        await session.save;
// delete stream video call 
const call =streamClient.video.call("default",session.clerkId)
await call.delete({hard:true})

//delete stream chat channel 
const channel =chatClient.channel("messaging",session.callId)
await channel.delete()



        res.status(200).json({ session, message: "Message ended successfully" });
    } catch (err) {
        console.error("Error in endSession controller", err.message)
        res.json({ message: "Internal Server Error", err }).status(500);
    }
}
