import { LoaderIcon, PlusIcon, UserPlus, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useProblems } from "../hooks/useProblems";
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
  const [invitedEmails, setInvitedEmails] = useState([]);

  const problems = problemsData?.problems || [];

  const addEmailField = () => {
    const maxInvites = Math.max(0, roomConfig.maxParticipants || 1);
    if (invitedEmails.length >= maxInvites) {
      toast.error(`Maximum invitees for this session capacity is ${maxInvites}`);
      return;
    }
    setInvitedEmails([...invitedEmails, ""]);
  };

  const handleEmailChange = (index, value) => {
    const updated = [...invitedEmails];
    updated[index] = value;
    setInvitedEmails(updated);
    setRoomConfig({
      ...roomConfig,
      invitedEmails: updated.filter(email => email.trim() !== ""),
    });
  };

  const removeEmailField = (index) => {
    const updated = invitedEmails.filter((_, i) => i !== index);
    setInvitedEmails(updated);
    setRoomConfig({
      ...roomConfig,
      invitedEmails: updated.filter(email => email.trim() !== ""),
    });
  };

  // Adjust invited emails list if maxParticipants changes and exceeds the capacity
  useEffect(() => {
    const maxInvites = Math.max(0, roomConfig.maxParticipants || 1);
    if (invitedEmails.length > maxInvites) {
      const updated = invitedEmails.slice(0, maxInvites);
      setInvitedEmails(updated);
      setRoomConfig({
        ...roomConfig,
        invitedEmails: updated.filter(email => email.trim() !== ""),
      });
    }
  }, [roomConfig.maxParticipants]);

  useEffect(() => {
    if (isOpen) {
      setInvitedEmails(roomConfig.invitedEmails || []);
      return;
    }

    setInvitedEmails([]);
  }, [isOpen, roomConfig.invitedEmails]);

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
                  setRoomConfig({ ...roomConfig, problem: "", difficulty: customProblem ? "" : "easy", problemId: null });
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
                    {num} participant slot{num > 1 ? "s" : ""}
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
            <div className="flex justify-between items-center">
              <label className="label">
                <span className="label-text font-semibold">Invite Peers (by Email)</span>
              </label>
              {invitedEmails.length < Math.max(0, roomConfig.maxParticipants || 1) && (
                <button
                  type="button"
                  onClick={addEmailField}
                  className="btn btn-xs btn-outline btn-accent flex items-center gap-1"
                >
                  <PlusIcon className="size-3" />
                  Add Recipient
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {invitedEmails.length === 0 ? (
                <p className="text-xs text-base-content/50 italic px-1">
                  No invitees. Add registered user emails and only those invited accounts will be able to auto-join.
                </p>
              ) : (
                invitedEmails.map((email, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="relative grow">
                      <input
                        type="email"
                        placeholder="peer@example.com"
                        className="input input-bordered w-full pl-10 input-sm focus:input-primary"
                        value={email}
                        onChange={(e) => handleEmailChange(index, e.target.value)}
                        required
                      />
                      <UserPlus className="absolute left-3 top-2.5 size-3.5 opacity-50" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmailField(index)}
                      className="btn btn-sm btn-error btn-circle"
                      title="Remove"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
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
