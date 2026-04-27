import { Code2Icon, LoaderIcon, PlusIcon, Search, UserPlus, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useProblems } from "../hooks/useProblems";
import { sessionApi } from "../api/sessions";
import toast from "react-hot-toast";

function CreateSessionModal({
  isOpen,
  onClose,
  roomConfig,
  setRoomConfig,
  onCreateRoom,
  isCreating,
}) {
  const { data: problemsData } = useProblems();
  const [customProblem, setCustomProblem] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const problems = problemsData?.problems || [];

  const handleSearchUser = async () => {
    if (!emailInput.trim()) return;
    setIsSearchingUser(true);
    try {
      const data = await sessionApi.searchUserByEmail(emailInput);
      if (invitedUsers.find((u) => u.email === data.user.email)) {
        toast.error("User already invited");
      } else {
        setInvitedUsers([...invitedUsers, data.user]);
        setRoomConfig({
          ...roomConfig,
          invitedEmails: [...(roomConfig.invitedEmails || []), data.user.email],
        });
        setEmailInput("");
        toast.success(`Found user: ${data.user.name}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "User not found");
    } finally {
      setIsSearchingUser(false);
    }
  };

  const removeInvitedUser = (email) => {
    setInvitedUsers(invitedUsers.filter((u) => u.email !== email));
    setRoomConfig({
      ...roomConfig,
      invitedEmails: (roomConfig.invitedEmails || []).filter((e) => e !== email),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl bg-base-100 shadow-2xl border border-base-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-2xl">Create New Session</h3>
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* PROBLEM SELECTION */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="label">
                <span className="label-text font-semibold">Select or Name Problem</span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <button
                className="btn btn-xs btn-outline btn-primary"
                onClick={() => {
                  setCustomProblem(!customProblem);
                  setRoomConfig({ ...roomConfig, problem: "", difficulty: "easy", problemId: null });
                }}
              >
                {customProblem ? "Select from list" : "Use custom name"}
              </button>
            </div>

            {customProblem ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter custom session/problem name..."
                  className="input input-bordered grow"
                  value={roomConfig.problem}
                  onChange={(e) => setRoomConfig({ ...roomConfig, problem: e.target.value, problemId: null })}
                />
                <select
                  className="select select-bordered"
                  value={roomConfig.difficulty}
                  onChange={(e) => setRoomConfig({ ...roomConfig, difficulty: e.target.value })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            ) : (
              <select
                className="select select-bordered w-full"
                value={roomConfig.problem}
                onChange={(e) => {
                  const selectedProblem = problems.find((p) => p.title === e.target.value);
                  setRoomConfig({
                    ...roomConfig,
                    difficulty: selectedProblem?.difficulty || "easy",
                    problem: e.target.value,
                    problemId: selectedProblem?._id || null,
                  });
                }}
              >
                <option value="" disabled>
                  Choose a coding problem...
                </option>
                {problems.map((problem) => (
                  <option key={problem._id} value={problem.title}>
                    {problem.title} ({problem.difficulty})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <label className="label">
              <span className="label-text font-semibold">Session Description (Optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full focus:textarea-primary transition-all"
              placeholder="Describe the session or problem statement..."
              value={roomConfig.description || ""}
              onChange={(e) => setRoomConfig({ ...roomConfig, description: e.target.value })}
              rows="2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MAX PARTICIPANTS */}
            <div className="space-y-2">
              <label className="label">
                <span className="label-text font-semibold">Max Participants</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={roomConfig.maxParticipants || 1}
                onChange={(e) =>
                  setRoomConfig({ ...roomConfig, maxParticipants: parseInt(e.target.value) })
                }
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? "(Solo/1v1)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* CHALLENGE MODE */}
            <div className="space-y-2">
              <label className="label">
                <span className="label-text font-semibold">Challenge Mode</span>
              </label>
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  roomConfig.isChallengeMode
                    ? "bg-warning/10 border-warning/50 text-warning-content"
                    : "bg-base-200 border-base-300 opacity-70"
                }`}
                onClick={() =>
                  setRoomConfig({ ...roomConfig, isChallengeMode: !roomConfig.isChallengeMode })
                }
              >
                {roomConfig.isChallengeMode ? (
                  <ShieldAlert className="size-5" />
                ) : (
                  <ShieldCheck className="size-5" />
                )}
                <div className="flex-1">
                  <p className="text-xs font-bold">Restrict Run/Commit</p>
                  <p className="text-[10px]">User cannot run code until enabled by host</p>
                </div>
                <input
                  type="checkbox"
                  className="checkbox checkbox-warning checkbox-sm"
                  checked={roomConfig.isChallengeMode || false}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* INVITE USERS */}
          <div className="space-y-2">
            <label className="label">
              <span className="label-text font-semibold">Invite Users (by Email)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative grow">
                <input
                  type="email"
                  placeholder="user@example.com"
                  className="input input-bordered w-full pl-10"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                />
                <Search className="absolute left-3 top-3 size-4 opacity-50" />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSearchUser}
                disabled={isSearchingUser || !emailInput}
              >
                {isSearchingUser ? <LoaderIcon className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Invite
              </button>
            </div>

            {invitedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {invitedUsers.map((user) => (
                  <div key={user.email} className="badge badge-lg gap-2 py-4">
                    <div className="avatar">
                      <div className="w-6 rounded-full">
                        <img src={user.profileImage || "/placeholder.png"} alt={user.name} />
                      </div>
                    </div>
                    {user.name}
                    <X className="size-3 cursor-pointer hover:text-error" onClick={() => removeInvitedUser(user.email)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-action border-t border-base-300 pt-4 mt-6">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary px-8 gap-2"
            onClick={onCreateRoom}
            disabled={isCreating || !roomConfig.problem}
          >
            {isCreating ? (
              <LoaderIcon className="size-5 animate-spin" />
            ) : (
              <PlusIcon className="size-5" />
            )}
            {isCreating ? "Creating..." : "Start Session"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
    </div>
  );
}

export default CreateSessionModal;