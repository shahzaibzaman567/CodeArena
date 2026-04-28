import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useActiveSessions, useCreateSession, useMyRecentSessions } from "../hooks/useSessions.js";
import { sessionApi } from "../api/sessions.js";

import Navbar from "../components/Navbar.jsx";
import WelcomeSection from "../components/WelcomeSection.jsx";
import StatsCards from "../components/StatsCards.jsx";
import ActiveSessions from "../components/ActiveSession.jsx";
import RecentSessions from "../components/RecentSessions.jsx";
import CreateSessionModal from "../components/CreateSessionsModal.jsx";
import { SearchIcon } from "lucide-react";

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomConfig, setRoomConfig] = useState({ problem: "", difficulty: "", description: "", maxParticipants: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const createSessionMutation = useCreateSession();

  const { data: activeSessionsData, isLoading: loadingActiveSessions } = useActiveSessions();
  const { data: recentSessionsData, isLoading: loadingRecentSessions } = useMyRecentSessions();

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
      },
      {
        onSuccess: (data) => {
          setShowCreateModal(false);
          setRoomConfig({ problem: "", difficulty: "", description: "", maxParticipants: 1 });
          const sessionId = data?.session?._id || data?._id;
          if (sessionId) {
            navigate(`/session/${sessionId}`);
          } else {
            toast.error("Session created but could not navigate. Please refresh.");
          }
        },
      }
    );
  };

  const activeSessions = Array.isArray(activeSessionsData)
    ? activeSessionsData
    : activeSessionsData?.sessions || [];
  const recentSessions = recentSessionsData?.sessions || [];

  const isUserInSession = (session) => {
    if (!user.id) return false;

    return session.host?.clerkId === user.id || session.participant?.clerkId === user.id;
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
                            <h3 className="card-title text-lg">{session.problem}</h3>
                            <p className="text-sm text-base-content/70">{session.description}</p>
                            <div className="flex gap-2 text-sm">
                              <span className="badge badge-primary">{session.difficulty}</span>
                              <span className="badge">{session.host?.name || "Host"}</span>
                            </div>
                            <p className="text-xs text-base-content/60">
                              Max Participants: {session.maxParticipants}
                            </p>
                            <button
                              onClick={() => navigate(`/session/${session._id}`)}
                              className="btn btn-sm btn-primary mt-2"
                            >
                              Join Session
                            </button>
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
