import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useActiveSessions, useCreateSession, useMyRecentSessions } from "../hooks/useSessions.js";
import { useClerkAuthSync } from "../hooks/useClerkAuthSync.js";
import { sessionApi } from "../api/sessions.js";

import Navbar from "../components/Navbar.jsx";
import WelcomeSection from "../components/WelcomeSection.jsx";
import StatsCards from "../components/StatsCards.jsx";
import ActiveSessions from "../components/ActiveSession.jsx";
import RecentSessions from "../components/RecentSessions.jsx";
import CreateSessionModal from "../components/CreateSessionsModal.jsx";
import { SearchIcon } from "lucide-react";
import { computeSessionCapacity } from "../lib/sessionCapacity.js";

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomConfig, setRoomConfig] = useState({
    problem: "",
    difficulty: "",
    description: "",
    maxParticipants: 1,
    isChallengeMode: false,
    invitedEmails: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const createSessionMutation = useCreateSession();
  const { authTokenReady, isSignedIn } = useClerkAuthSync();
  const sessionsQueryEnabled = isSignedIn && authTokenReady;

  const { data: activeSessionsData, isLoading: loadingActiveSessions } = useActiveSessions(
    sessionsQueryEnabled
  );
  const { data: recentSessionsData, isLoading: loadingRecentSessions } = useMyRecentSessions(
    sessionsQueryEnabled
  );

  // Feature 1: Search sessions
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      try {
        const data = await sessionApi.searchSessions(query);
        setSearchResults(data.sessions || []);
        setShowSearchResults(true);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  const handleCreateRoom = () => {
    if (!roomConfig.problem?.trim()) {
      toast.error("Please enter a problem name");
      return;
    }
    if (!roomConfig.difficulty) {
      toast.error("Please select a difficulty");
      return;
    }

    createSessionMutation.mutate(
      {
        problem: roomConfig.problem,
        difficulty: roomConfig.difficulty.toLowerCase(),
        description: roomConfig.description || "",
        maxParticipants: roomConfig.maxParticipants || 1,
        invitedEmails: roomConfig.invitedEmails || [],
        isChallengeMode: roomConfig.isChallengeMode || false,
      },
      {
        onSuccess: (data) => {
          setShowCreateModal(false);
          setRoomConfig({
            problem: "",
            difficulty: "",
            description: "",
            maxParticipants: 1,
            isChallengeMode: false,
            invitedEmails: [],
          });
          
          // 🛡️ Senior Dev: Robust ID detection (handles various backend response shapes)
          const sessionId = data?.session?._id || data?.session?.id || data?._id || data?.id;
          
          if (sessionId) {
            navigate(`/session/${sessionId}`);
          } else {
             // Fallback: If for some reason the ID isn't found, don't just error out
            toast.success("Session ready! Please join from the list.");
            if (typeof refetch === 'function') refetch();
          }
        },
      }
    );
  };

  const activeSessions = Array.isArray(activeSessionsData)
    ? activeSessionsData
    : activeSessionsData?.sessions || [];
  const recentSessions = recentSessionsData?.sessions || [];

  const isUserHost = (session) => session.host?.clerkId === user?.id;

  const isUserInSession = (session) => {
    if (!user?.id) return false;

    return (
      isUserHost(session) ||
      (session.participants || []).some((participant) => participant?.clerkId === user.id)
    );
  };

  return (
    <>
      <div className="min-h-screen bg-base-300">
        <Navbar />
        <WelcomeSection onCreateSession={() => setShowCreateModal(true)} />

        {/* Feature 1: Search bar */}
        <div className="container mx-auto px-6 py-6">
          <div className="form-control">
            <label className="input input-bordered flex items-center gap-2 mb-4">
              <SearchIcon className="size-5" />
              <input
                type="text"
                placeholder="Search sessions by problem or description..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="grow"
              />
            </label>

            {/* Search Results */}
            {showSearchResults && (
              <div className="card bg-base-100 shadow-lg mb-6">
                <div className="card-body">
                  <h2 className="card-title">Search Results</h2>
                  {isSearching ? (
                    <p className="loading loading-spinner"></p>
                  ) : searchResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((session) => (
                        <div key={session._id} className="card bg-base-200 border border-base-300">
                          <div className="card-body">
                            {(() => {
                              const capacity = session?.capacity || computeSessionCapacity(session);
                              const isHost = isUserHost(session);
                              const isMember = isUserInSession(session);
                              const roomFull = capacity.isFull;
                              const canEnter = isHost || isMember || !roomFull;

                              return (
                                <>
                            <h3 className="card-title text-lg">{session.problem}</h3>
                            <p className="text-sm text-base-content/70">{session.description}</p>
                            <div className="flex gap-2 text-sm flex-wrap">
                              <span className="badge badge-primary">{session.difficulty}</span>
                              <span className="badge">{session.host?.name || "Host"}</span>
                              {roomFull && (
                                <span className="inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1.5 rounded-md bg-error text-error-content text-[10px] font-black uppercase">
                                  Full
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-base-content/60">
                              {capacity.joinedCount}/{capacity.maxParticipants} joined · {capacity.slotsAvailable} open
                            </p>
                            <button
                              onClick={() => navigate(`/session/${session._id}`)}
                              disabled={!canEnter}
                              className={`btn btn-sm mt-2 ${canEnter ? "btn-primary" : "btn-disabled"}`}
                            >
                              {!canEnter
                                ? "Full"
                                : isHost
                                ? roomFull
                                  ? "Open & End"
                                  : "Rejoin Session"
                                : isMember
                                ? "Rejoin Session"
                                : "Join Session"}
                            </button>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base-content/70">No sessions found matching your search.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grid layout */}
        <div className="container mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StatsCards
              activeSessionsCount={activeSessions.length}
              recentSessionsCount={recentSessions.length}
            />
            <ActiveSessions
              sessions={activeSessions}
              isLoading={loadingActiveSessions}
              isUserInSession={isUserInSession}
              isUserHost={isUserHost}
            />
          </div>

          <RecentSessions sessions={recentSessions} isLoading={loadingRecentSessions} />
        </div>
      </div>

      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        roomConfig={roomConfig}
        setRoomConfig={setRoomConfig}
        onCreateRoom={handleCreateRoom}
        isCreating={createSessionMutation.isPending}
      />
    </>
  );
}

export default DashboardPage;
