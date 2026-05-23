import mongoose from "mongoose";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { getChatClient, getStreamClient } from "../lib/stream.js";
import { sendSessionInvitation, isEmailValid } from "../lib/emailService.js";
import { ENV } from "../lib/env.js";
import { normalizeEmail } from "../lib/normalizeEmail.js";
import { getObjectIdString } from "../lib/sessionHelpers.js";
import { computeSessionCapacity, getJoinCapacityExpr } from "../lib/sessionCapacity.js";

const SESSION_POPULATION = [
  { path: "host", select: "name profileImage email clerkId role" },
  { path: "participants", select: "name profileImage email clerkId role" },
  { path: "invitedUsers.user", select: "name profileImage email clerkId role" },
];

// normalizeEmail imported from shared helper
const validateInviteEmails = async (emails = []) => {
  const requested = [...new Set((emails || []).map(normalizeEmail).filter(Boolean))];
  if (!requested.length) {
    return { validEmails: [], invalidEmails: [] };
  }

  const validated = await Promise.all(
    requested.map(async (email) => ({ email, valid: await isEmailValid(email) }))
  );

  return {
    validEmails: validated.filter((item) => item.valid).map((item) => item.email),
    invalidEmails: validated.filter((item) => !item.valid).map((item) => item.email),
  };
};

const attachCapacityMeta = (session) => {
  const doc = session?.toObject ? session.toObject() : { ...session };
  const capacity = computeSessionCapacity(doc);
  return { ...doc, capacity };
};

const getInviteEmailClauses = (user) => {
  const normalized = normalizeEmail(user?.email);
  const raw = user?.email?.trim()?.toLowerCase() || "";
  const clauses = [];

  if (normalized) {
    clauses.push({ "invitedUsers.email": normalized });
    clauses.push({
      invitedUsers: {
        $elemMatch: { email: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") } },
      },
    });
  }

  if (raw && raw !== normalized) {
    clauses.push({ "invitedUsers.email": raw });
  }

  return clauses;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMemberSessionClauses = (user) => [
  { host: user._id },
  { participants: user._id },
  { "invitedUsers.user": user._id },
  ...getInviteEmailClauses(user),
];

export async function linkInvitationsForUser(user) {
  const normalized = normalizeEmail(user?.email);
  if (!normalized || normalized.endsWith("@clerk.codearena.local")) {
    return 0;
  }

  const variants = [...new Set([normalized, user.email?.trim()?.toLowerCase()].filter(Boolean))];
  const sessions = await Session.find({
    status: "active",
    "invitedUsers.email": { $in: variants },
  });

  let updated = 0;

  for (const session of sessions) {
    let dirty = false;

    for (const invite of session.invitedUsers || []) {
      const inviteNormalized = normalizeEmail(invite.email);
      const inviteRaw = invite.email?.trim()?.toLowerCase() || "";
      const matches =
        variants.includes(inviteNormalized) ||
        variants.includes(inviteRaw) ||
        inviteNormalized === normalized;

      if (matches && getObjectIdString(invite.user) !== getObjectIdString(user._id)) {
        invite.user = user._id;
        if (!invite.name) invite.name = user.name;
        dirty = true;
      }
    }

    if (dirty) {
      await session.save();
      updated += 1;
    }
  }

  return updated;
}

const findInvitationForUser = (session, user) => {
  const userId = getObjectIdString(user?._id);
  const email = normalizeEmail(user?.email);

  return (session?.invitedUsers || []).find((invite) => {
    const invitedUserId = getObjectIdString(invite.user);
    return invitedUserId === userId || normalizeEmail(invite.email) === email;
  });
};

const buildViewerState = (session, user) => {
  const hostId = getObjectIdString(session?.host);
  const participantIds = (session?.participants || []).map((participant) => getObjectIdString(participant));
  const isHost = hostId === getObjectIdString(user?._id);
  const isParticipant = participantIds.includes(getObjectIdString(user?._id));
  const invitation = findInvitationForUser(session, user);
  const isInvited = Boolean(invitation);
  const hasInvites = (session?.invitedUsers || []).length > 0;
  const capacity = computeSessionCapacity(session);
  const isActive = session?.status === "active";

  const canAccess =
    isActive || isHost || isParticipant || isInvited;
  const canJoin = isActive && !isHost && !isParticipant && !capacity.isFull;

  return {
    isHost,
    isParticipant,
    isInvited,
    requiresInvitation: hasInvites,
    isFull: capacity.isFull,
    canAccess,
    canJoin,
    participantSlotsUsed: capacity.slotsUsed,
    participantSlotsTotal: capacity.maxParticipants,
    joinedCount: capacity.joinedCount,
    pendingInviteCount: capacity.pendingInviteCount,
    slotsAvailable: capacity.slotsAvailable,
    totalJoined: capacity.joinedCount + 1,
    totalCapacity: capacity.maxParticipants + 1,
  };
};

const populateSession = async (query) => {
  let chained = query;
  for (const population of SESSION_POPULATION) {
    chained = chained.populate(population);
  }
  return chained;
};

const findSessionByIdentifier = async (id, { populate = false } = {}) => {
  const buildQuery = (baseQuery) => (populate ? populateSession(baseQuery) : baseQuery);

  if (mongoose.Types.ObjectId.isValid(id)) {
    const byId = await buildQuery(Session.findById(id));
    if (byId) {
      return byId;
    }
  }

  return buildQuery(Session.findOne({ callId: id }));
};

export async function createSession(req, res) {
  let session;

  try {
    const {
      problem,
      difficulty,
      description,
      maxParticipants,
      invitedEmails,
      problemId,
      isChallengeMode,
    } = req.body;

    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!problem?.trim() || !difficulty) {
      return res.status(400).json({ message: "Problem and difficulty are required" });
    }

    const clampedMaxParticipants = Math.min(5, Math.max(1, Number(maxParticipants) || 1));
    const cleanedInvitedEmails = [...new Set((invitedEmails || []).map(normalizeEmail).filter(Boolean))].filter(
      (email) => email !== normalizeEmail(req.user.email)
    );

    const { validEmails: requestedEmails, invalidEmails } = await validateInviteEmails(cleanedInvitedEmails);
    // If some emails are invalid, drop them and continue creating the session.
    // We will report them back in `inviteErrors` rather than failing the whole request.
    const removedInvalidEmails = invalidEmails || [];

    if (requestedEmails.length > clampedMaxParticipants) {
      return res.status(400).json({
        message: `You can invite up to ${clampedMaxParticipants} participant(s) for this session.`,
      });
    }

    const invitedUserDocs = requestedEmails.length
      ? await User.find({ email: { $in: requestedEmails } }).select("_id name email")
      : [];

    const invitedUsersByEmail = new Map(
      invitedUserDocs.map((invitedUser) => [normalizeEmail(invitedUser.email), invitedUser])
    );

    const invitedUsers = requestedEmails.map((email) => {
      const invitedUser = invitedUsersByEmail.get(email);
      return {
        user: invitedUser?._id || null,
        name: invitedUser?.name || "",
        email,
        status: "pending",
      };
    });

    const callId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    session = await Session.create({
      problem: problem.trim(),
      problemId: problemId || null,
      difficulty,
      host: userId,
      callId,
      description: description?.trim() || "",
      maxParticipants: clampedMaxParticipants,
      invitedUsers,
      isChallengeMode: Boolean(isChallengeMode),
    });

    try {
      await getChatClient().upsertUser({
        id: clerkId,
        name: req.user.name || clerkId,
        image: req.user.profileImage || "",
        role: "user",
      });
    } catch (upsertErr) {
      console.warn("Stream Chat user upsert warning:", upsertErr.message);
    }

    try {
      await getStreamClient().upsertUsers([
        {
          id: clerkId,
          name: req.user.name || clerkId,
          image: req.user.profileImage || "",
          role: "user",
        },
      ]);
    } catch (videoUpsertErr) {
      console.warn("Stream Video user upsert warning:", videoUpsertErr.message);
    }

    const call = getStreamClient().video.call("default", callId);
    await call.getOrCreate({
      data: {
        created_by_id: clerkId,
        members: [{ user_id: clerkId, role: "admin" }],
        custom: { problem: problem.trim(), difficulty, sessionId: session._id.toString() },
      },
    });

    const channel = getChatClient().channel("messaging", callId, {
      name: `${problem.trim()} Session`,
      created_by_id: clerkId,
      members: [{ user_id: clerkId }],
    });

    await channel.create();

    let inviteErrors = [];
    let inviteResults = [];
    if (requestedEmails.length > 0) {
      const sessionUrl = `${ENV.CLIENT_URL || "http://localhost:5173"}/session/${session._id}`;
      const hostName = req.user.name || "A coder";

      console.log(`[session] sending ${invitedUsers.length} invitation(s) to: ${requestedEmails.join(", ")}`);

      const results = await Promise.allSettled(
        invitedUsers.map((invite) =>
          sendSessionInvitation({
            toEmail: invite.email,
            hostName,
            problemName: problem.trim(),
            sessionUrl,
            description: description?.trim() || "",
            difficulty,
            maxParticipants: clampedMaxParticipants,
          })
            .then((info) => ({ status: "fulfilled", info }))
            .catch((emailErr) => {
              const message = `Invite failed for ${invite.email}: ${emailErr.message}`;
              console.warn(message);
              throw new Error(message);
            })
        )
      );

      inviteResults = results.map((result, index) => {
        const email = invitedUsers[index]?.email;
        if (result.status === "fulfilled") {
          return {
            email,
            status: "sent",
            messageId: result.value?.info?.messageId || null,
          };
        }
        return {
          email,
          status: "failed",
          error: result.reason?.message || "Unknown invite delivery failure",
        };
      });

      inviteErrors = inviteResults
        .filter((item) => item.status === "failed")
        .map((item) => item.error);
      // Append any removed/invalid emails as errors so the client knows they were skipped
      if (removedInvalidEmails.length) {
        inviteErrors = inviteErrors.concat(
          removedInvalidEmails.map((em) => `Invalid invite email: ${em}`)
        );
      }
    }

    // If there were no requestedEmails but some invalid emails were found, report them
    if (requestedEmails.length === 0 && removedInvalidEmails.length) {
      inviteErrors = inviteErrors.concat(removedInvalidEmails.map((em) => `Invalid invite email: ${em}`));
    }

    const createdSession = await findSessionByIdentifier(session._id.toString(), { populate: true });
    return res.status(201).json({
      session: createdSession,
      viewer: buildViewerState(createdSession, req.user),
      inviteErrors,
      inviteResults,
    });
  } catch (err) {
    console.error("Error in createSession controller:", err);

    if (session?._id) {
      try {
        await Session.findByIdAndDelete(session._id);
      } catch (cleanupErr) {
        console.error("Failed to rollback session:", cleanupErr.message);
      }
    }

    res.status(500).json({
      message: err.message || "Internal Server Error",
      error: err.message,
    });
  }
}

export async function getActiveSession(req, res) {
  try {
    await linkInvitationsForUser(req.user);

    const sessions = await populateSession(
      Session.find({ status: "active" }).sort({ createdAt: -1 }).limit(50)
    );

    return res.status(200).json({
      sessions: sessions.map((session) => attachCapacityMeta(session)),
    });
  } catch (err) {
    console.error("Error in getActiveSession:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function getMyRecentSession(req, res) {
  try {
    const sessions = await populateSession(
      Session.find({
        status: "completed",
        $or: getMemberSessionClauses(req.user),
      })
        .sort({ createdAt: -1 })
        .limit(20)
    );

    return res.status(200).json({ sessions });
  } catch (err) {
    console.error("Error in getMyRecentSession:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function getSessionById(req, res) {
  try {
    const session = await findSessionByIdentifier(req.params.id, { populate: true });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const viewer = buildViewerState(session, req.user);

    if (!viewer.canAccess) {
      return res.status(403).json({ message: "This session is no longer available." });
    }

    if (viewer.isHost || viewer.isParticipant) {
      try {
        const call = getStreamClient().video.call("default", session.callId);
        await call.updateCallMembers({
          update_members: [{ user_id: req.user.clerkId, role: viewer.isHost ? "admin" : "user" }],
        });

        const channel = getChatClient().channel("messaging", session.callId);
        await channel.addMembers([req.user.clerkId]);
      } catch (streamErr) {
        console.warn("Stream membership sync warning:", streamErr.message);
      }
    }

    return res.status(200).json({
      session: attachCapacityMeta(session),
      viewer,
    });
  } catch (err) {
    console.error("Error in getSessionById:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function joinSession(req, res) {
  try {
    const session = await findSessionByIdentifier(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    if (getObjectIdString(session.host) === getObjectIdString(req.user._id)) {
      return res.status(400).json({ message: "Host cannot join their own session as participant" });
    }

    const viewer = buildViewerState(session, req.user);

    if (!viewer.canAccess) {
      return res.status(403).json({ message: "This session is no longer available." });
    }

    if (viewer.isFull && !viewer.isParticipant) {
      return res.status(409).json({
        message: `Session is full. ${viewer.participantSlotsTotal} participant slot(s) are reserved.`,
      });
    }

    if (viewer.isParticipant) {
      const populatedSession = await findSessionByIdentifier(session._id.toString(), { populate: true });
      return res.status(200).json({
        session: populatedSession,
        viewer: buildViewerState(populatedSession, req.user),
        message: "Already a participant",
      });
    }

    // Perform an atomic check-and-push to avoid race conditions where multiple users
    // could join at the same time and exceed `maxParticipants`.
    const filter = {
      _id: session._id,
      status: "active",
      host: { $ne: req.user._id },
      $expr: getJoinCapacityExpr(),
    };

    const update = { $addToSet: { participants: req.user._id } };
    const options = { new: true };

    const updated = await Session.findOneAndUpdate(filter, update, options).populate(
      SESSION_POPULATION
    );

    if (!updated) {
      // Re-fetch to determine precise reason (already full or other access issue)
      const refreshed = await findSessionByIdentifier(session._id.toString(), { populate: true });
      const refreshedViewer = buildViewerState(refreshed, req.user);

      if (refreshedViewer.isParticipant) {
        return res.status(200).json({
          session: refreshed,
          viewer: refreshedViewer,
          message: "Already a participant",
        });
      }

      if (refreshedViewer.isFull) {
        return res.status(409).json({
          message: `Session is full. Maximum ${session.maxParticipants} participant(s) allowed.`,
        });
      }

      return res.status(400).json({ message: "Unable to join session" });
    }

    // If the user was invited, mark invitation as accepted
    const invitation = findInvitationForUser(updated, req.user);
    if (invitation) {
      try {
        await Session.updateOne(
          { _id: updated._id, "invitedUsers.email": normalizeEmail(req.user.email) },
          {
            $set: {
              "invitedUsers.$.user": req.user._id,
              "invitedUsers.$.name": req.user.name,
              "invitedUsers.$.status": "accepted",
              "invitedUsers.$.respondedAt": new Date(),
            },
          }
        );
      } catch (inviteErr) {
        console.warn("Failed to update invitation status:", inviteErr.message);
      }
    }

    try {
      const call = getStreamClient().video.call("default", updated.callId);
      await call.updateCallMembers({ update_members: [{ user_id: req.user.clerkId, role: "user" }] });

      const channel = getChatClient().channel("messaging", updated.callId);
      await channel.addMembers([req.user.clerkId]);
    } catch (streamErr) {
      console.warn("Join stream sync warning:", streamErr.message);
    }

    const populatedSession = await findSessionByIdentifier(updated._id.toString(), { populate: true });

    return res.status(200).json({
      session: populatedSession,
      viewer: buildViewerState(populatedSession, req.user),
    });
  } catch (err) {
    console.error("Error in joinSession:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function endSession(req, res) {
  try {
    const session = await findSessionByIdentifier(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (getObjectIdString(session.host) !== getObjectIdString(req.user._id)) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    try {
      const call = getStreamClient().video.call("default", session.callId);
      await call.delete({ hard: true });
    } catch (callErr) {
      console.warn("Stream call delete warning:", callErr.message);
    }

    try {
      const channel = getChatClient().channel("messaging", session.callId);
      await channel.delete();
    } catch (channelErr) {
      console.warn("Stream channel delete warning:", channelErr.message);
    }

    session.status = "completed";
    await session.save();

    const populatedSession = await findSessionByIdentifier(session._id.toString(), { populate: true });
    return res.status(200).json({
      session: populatedSession,
      viewer: buildViewerState(populatedSession, req.user),
      message: "Session ended successfully",
    });
  } catch (err) {
    console.error("Error in endSession:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function searchSessions(req, res) {
  try {
    const { query } = req.query;

    if (!query?.trim()) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const sessions = await populateSession(
      Session.find({
        status: "active",
        $or: [
          { problem: { $regex: query.trim(), $options: "i" } },
          { description: { $regex: query.trim(), $options: "i" } },
        ],
      }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      sessions: sessions.map((session) => attachCapacityMeta(session)),
    });
  } catch (err) {
    console.error("Error in searchSessions:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function deleteSession(req, res) {
  try {
    const session = await findSessionByIdentifier(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const userId = getObjectIdString(req.user._id);
    const hostId = getObjectIdString(session.host);
    const isHost = hostId === userId;
    const isParticipant = (session.participants || []).some(
      (participant) => getObjectIdString(participant) === userId
    );

    if (isHost) {
      await Session.findByIdAndDelete(session._id);
      return res.status(200).json({ message: "Session deleted successfully", removed: "session" });
    }

    if (isParticipant) {
      session.participants = session.participants.filter(
        (participant) => getObjectIdString(participant) !== userId
      );
    } else {
      const invitation = findInvitationForUser(session, req.user);
      if (!invitation) {
        return res.status(403).json({ message: "You are not allowed to remove this session." });
      }
    }

    const userEmail = normalizeEmail(req.user.email);
    if (userEmail) {
      session.invitedUsers = (session.invitedUsers || []).filter(
        (invite) =>
          normalizeEmail(invite.email) !== userEmail &&
          getObjectIdString(invite.user) !== userId
      );
    }

    await session.save();
    return res.status(200).json({
      message: "Session removed from your history",
      removed: "membership",
    });
  } catch (err) {
    console.error("Error in deleteSession:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function checkUserByEmail(req, res) {
  try {
    const email = normalizeEmail(req.query.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select("name email profileImage role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error("Error in checkUserByEmail:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}

export async function updateSession(req, res) {
  try {
    const session = await findSessionByIdentifier(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const viewer = buildViewerState(session, req.user);

    if (!viewer.isHost && !viewer.isParticipant) {
      return res.status(403).json({ message: "Only session members can update this session." });
    }

    const { isChallengeMode, problem, description, difficulty, languageCodeMap } = req.body;

    if (viewer.isHost) {
      if (typeof isChallengeMode === "boolean") session.isChallengeMode = isChallengeMode;
      if (problem?.trim()) session.problem = problem.trim();
      if (description !== undefined) session.description = `${description}`.trim();
      if (difficulty) session.difficulty = difficulty;
    }

    if (languageCodeMap && typeof languageCodeMap === "object") {
      session.languageCodeMap = new Map();
      Object.entries(languageCodeMap).forEach(([language, code]) => {
        session.languageCodeMap.set(language, `${code ?? ""}`);
      });
    }

    await session.save();

    const populatedSession = await findSessionByIdentifier(session._id.toString(), { populate: true });

    return res.status(200).json({
      session: populatedSession,
      viewer: buildViewerState(populatedSession, req.user),
      message: "Session updated successfully",
    });
  } catch (err) {
    console.error("Error in updateSession:", err.message);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
