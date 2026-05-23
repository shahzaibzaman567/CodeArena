import { Code2, Clock, Users, Trophy, Loader, Trash2, Search, User as UserIcon } from "lucide-react";
import { getDifficultyBadgeClass, normalizeEmail } from "../lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useDeleteSession } from "../hooks/useSessions";
import { useUser } from "@clerk/clerk-react";

function RecentSessions({ sessions, isLoading }) {
  const [searchQuery, setSearchQuery] = useState("");
  const deleteSessionMutation = useDeleteSession();
  const { user } = useUser();

  const filteredSessions = sessions.filter((session) =>
    session.problem.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canRemoveSession = (session) => {
    if (!user?.id) return false;
    const isHost = session.host?.clerkId === user.id;
    const isParticipant = (session.participants || []).some(
      (participant) => participant?.clerkId === user.id
    );
    const userEmail = normalizeEmail(user?.primaryEmailAddress?.emailAddress);
    const isInvited = (session.invitedUsers || []).some(
      (invite) => normalizeEmail(invite?.email) === userEmail
    );
    return isHost || isParticipant || isInvited;
  };

  const handleDelete = (e, session) => {
    e.preventDefault();
    e.stopPropagation();
    const isHost = session.host?.clerkId === user?.id;
    const message = isHost
      ? "Delete this session for everyone?"
      : "Remove this session from your dashboard?";
    if (window.confirm(message)) {
      deleteSessionMutation.mutate(session._id);
    }
  };

  return (
    <div className="card bg-base-100 border-2 border-accent/20 hover:border-accent/30 mt-8">
      <div className="card-body">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-accent to-secondary rounded-xl">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-black">Your Past Sessions</h2>
          </div>

          <div className="form-control">
            <div className="input-group">
              <label className="input input-bordered input-sm flex items-center gap-2">
                <Search className="w-4 h-4 opacity-70" />
                <input
                  type="text"
                  placeholder="Search past sessions..."
                  className="grow"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-20">
              <Loader className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map((session) => {
              // Multi-participant capacity
              const participantsArr = session.participants || [];
              const maxP = session.maxParticipants || 1;
              const joined = participantsArr.length;
              const total = maxP;

              return (
                <div
                  key={session._id}
                  className={`card relative group ${
                    session.status === "active"
                      ? "bg-success/10 border-success/30 hover:border-success/60"
                      : "bg-base-200 border-base-300 hover:border-primary/30"
                  }`}
                >
                  {canRemoveSession(session) && (
                    <button
                      onClick={(e) => handleDelete(e, session)}
                      className="absolute top-3 right-3 p-2 bg-error/10 text-error rounded-lg hover:bg-error hover:text-white transition-colors border border-error/20"
                      title={
                        session.host?.clerkId === user?.id
                          ? "Delete session"
                          : "Remove from your history"
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="card-body p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          session.status === "active"
                            ? "bg-gradient-to-br from-success to-success/70"
                            : "bg-gradient-to-br from-primary to-secondary"
                        }`}
                      >
                        <Code2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base mb-1 truncate">{session.problem}</h3>
                        <span
                          className={`badge badge-sm ${getDifficultyBadgeClass(session.difficulty)}`}
                        >
                          {session.difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm opacity-80 mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatDistanceToNow(new Date(session.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-primary" />
                          <span className="font-medium">Host:</span>
                          <span className="truncate">{session.host?.name || "Unknown"}</span>
                        </div>

                        {/* Show participants count */}
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-secondary" />
                          <span className="font-medium">Participants:</span>
                          <span>{joined}/{total}</span>
                        </div>

                        {/* List participant names if available */}
                        {participantsArr.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {participantsArr.slice(0, 3).map((p, i) => (
                              <span
                                key={i}
                                className="badge badge-sm badge-ghost truncate max-w-[100px]"
                                title={p?.name || "Guest"}
                              >
                                {p?.name || "Guest"}
                              </span>
                            ))}
                            {participantsArr.length > 3 && (
                              <span className="badge badge-sm badge-ghost">
                                +{participantsArr.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-base-300">
                      <span className="text-xs font-semibold opacity-80 uppercase">
                        {session.status}
                      </span>
                      <span className="text-xs opacity-40">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-3xl flex items-center justify-center">
                <Trophy className="w-10 h-10 text-accent/50" />
              </div>
              <p className="text-lg font-semibold opacity-70 mb-1">
                {searchQuery ? "No matching sessions" : "No sessions yet"}
              </p>
              <p className="text-sm opacity-50">
                {searchQuery ? "Try a different search term" : "Start your coding journey today!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecentSessions;
