import { getObjectIdString } from "./sessionHelpers.js";

export const computeSessionCapacity = (session) => {
  const maxParticipants = Math.max(1, Number(session?.maxParticipants) || 1);
  const participants = session?.participants || [];
  const joinedCount = participants.length;

  const participantIds = new Set(
    participants.map((participant) => getObjectIdString(participant))
  );

  const pendingInviteCount = (session?.invitedUsers || []).filter((invite) => {
    const invitedUserId = getObjectIdString(invite?.user);
    if (!invitedUserId) return true;
    return !participantIds.has(invitedUserId);
  }).length;

  const slotsUsed = joinedCount;
  const slotsAvailable = Math.max(0, maxParticipants - joinedCount);
  const isFull = joinedCount >= maxParticipants;

  return {
    maxParticipants,
    joinedCount,
    pendingInviteCount,
    slotsUsed,
    slotsAvailable,
    isFull,
  };
};

export const getJoinCapacityExpr = () => ({
  $lt: [{ $size: { $ifNull: ["$participants", []] } }, "$maxParticipants"],
});
