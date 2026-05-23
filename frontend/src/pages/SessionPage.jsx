import { SignInButton, useUser } from "@clerk/clerk-react";
import { useEffect, useState, useCallback, useMemo, useRef, Component } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEndSession, useJoinSession, useSessionById, useUpdateSession } from "../hooks/useSessions.js";
import { useSaveProgress } from "../hooks/useSubmissions.js";
import { useProblemById, useCreateProblem } from "../hooks/useProblems.js";
import { executeCode } from "../lib/codeExecution.js";
import { aiApi } from "../api/ai.js";
import { LANGUAGE_CONFIG } from "../data/problems.js";
import Navbar from "../components/Navbar.jsx";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { getDifficultyBadgeClass } from "../lib/utils.js";
import { 
  Loader2Icon, 
  LogOutIcon, 
  PhoneOffIcon, 
  ShieldAlert, 
  ShieldCheck, 
  UsersIcon, 
  ArrowRightIcon 
} from "lucide-react";
import CodeEditorPanel from "../components/CodeEditor.jsx";
import OutputPanel from "../components/OutputPanel.jsx";
import { debounce } from "lodash-es";

import useStreamClient from "../hooks/useStreamClient.js";
import { useClerkAuthSync } from "../hooks/useClerkAuthSync.js";
import useSocket from "../hooks/useSocket.js";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI.jsx";
import toast from "react-hot-toast";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const { authTokenReady, authReady, isLoaded: isUserLoaded, isSignedIn } = useClerkAuthSync();
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "/";
  const [editorMarkers, setEditorMarkers] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [controlHandedTo, setControlHandedTo] = useState(null);

  const { data: sessionData, isLoading: loadingSession, isError: sessionLoadError, error: sessionLoadErrorInfo, refetch } = useSessionById(id, {
    enabled: isSignedIn && isUserLoaded && authTokenReady,
  });
  const updateSessionMutation = useUpdateSession();
  
  const { data: problemResult } = useProblemById(sessionData?.session?.problemId);
  const problemData = problemResult?.problem;

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();
  const createProblemMutation = useCreateProblem();

  const session = sessionData?.session;
  const viewer = sessionData?.viewer;
  const sessionParticipants = session?.participants || [];
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = sessionParticipants.some((participant) => participant?.clerkId === user?.id);
  const otherMembers = [session?.host, ...sessionParticipants].filter(
    (member) => member?.clerkId && member.clerkId !== user?.id
  );
  const otherUser = otherMembers[0] || null;

  const { 
    socket, 
    isConnected: isSocketConnected, 
    handoffControl, 
    revokeControl,
    on: onSocket,
    off: offSocket
  } = useSocket(id, user?.id, isHost || isParticipant);

  const { call, channel, chatClient, isInitializingCall, streamClient, videoBlockedReason } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant,
    authTokenReady
  );

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeByLanguage, setCodeByLanguage] = useState({});
  const code = codeByLanguage[selectedLanguage] || "";
  const autoJoinAttemptedRef = useRef(false);

  // Sync code with AI widget
  const syncCodeWithAI = useCallback((newCode, lang, problem) => {
    window.dispatchEvent(new CustomEvent("arena-code-update", {
      detail: { code: newCode, language: lang, problem: problem }
    }));
  }, []);

  const sessionRef = useRef(session);
  const isHostRef = useRef(isHost);
  const isParticipantRef = useRef(isParticipant);
  const debouncedSyncRef = useRef(null);

  // Update refs when values change (no re-render triggered)
  sessionRef.current = session;
  isHostRef.current = isHost;
  isParticipantRef.current = isParticipant;

  // Create debounced function only ONCE on mount
  useEffect(() => {
    debouncedSyncRef.current = debounce(() => {
      const sess = sessionRef.current;
      const isHostVal = isHostRef.current;
      const isParticipantVal = isParticipantRef.current;
      
      if ((isHostVal || isParticipantVal) && sess?._id) {
        updateSessionMutation.mutate({ 
          id: sess._id, 
          data: { languageCodeMap: debouncedSyncRef.current?.pendingData } 
        }, {
          onError: (err) => {
            const errorMsg = err.response?.data?.message || err.message || "Code sync failed";
            toast.error(`Failed to sync code: ${errorMsg}`);
          }
        });
      }
    }, 2000);

    return () => {
      if (debouncedSyncRef.current) {
        debouncedSyncRef.current.cancel();
      }
    };
  }, []);

  // Function to trigger the debounced sync
  const debouncedSync = useCallback((newCodeMap) => {
    if (debouncedSyncRef.current) {
      debouncedSyncRef.current.cancel();
      debouncedSyncRef.current.pendingData = newCodeMap;
      debouncedSyncRef.current();
    }
  }, []);

  const hasInitializedCode = useRef(false);
  
  useEffect(() => {
    if (session && !hasInitializedCode.current) {
      const initialMap = {};
      if (session.languageCodeMap) {
        Object.keys(session.languageCodeMap).forEach(lang => {
          initialMap[lang] = session.languageCodeMap[lang];
        });
      }
      
      const languages = ["javascript", "python", "java", "cpp", "csharp"];
      languages.forEach(lang => {
        if (!initialMap[lang]) {
          initialMap[lang] = problemData?.starterCode?.[lang] || `// Welcome to your custom session: ${session.problem}\n// Start coding here...`;
        }
      });
      
      setCodeByLanguage(initialMap);
      hasInitializedCode.current = true;
    }
  }, [session, problemData]);

  const channelRef = useRef(channel);
  const chatClientRef = useRef(chatClient);

  // Update refs when values change
  channelRef.current = channel;
  chatClientRef.current = chatClient;

  // Instant broadcast function
  const broadcastCode = useCallback((language, code) => {
    const ch = channelRef.current;
    const client = chatClientRef.current;
    if (ch && client?.userID) {
      ch.sendEvent({
        type: "code_update",
        language,
        code,
      }).catch(err => {
        if (!err.message?.includes("tokens are not set")) {
          // Broadcast failed silently
        }
      });
    }
  }, []);

  const handleCodeChange = useCallback((value) => {
    const newMap = {
      ...codeByLanguage,
      [selectedLanguage]: value
    };
    setCodeByLanguage(newMap);

    // 1. Sync the full code map with DB (debounced)
    debouncedSync(newMap);

    // 2. Broadcast only the current language code to partner (instant - no debounce)
    broadcastCode(selectedLanguage, value);
  }, [selectedLanguage, codeByLanguage, debouncedSync, broadcastCode]);

  const debouncedSyncAI = useCallback(
    debounce((newCode, lang, problem) => {
      syncCodeWithAI(newCode, lang, problem);
    }, 300),
    [syncCodeWithAI]
  );

  useEffect(() => {
    debouncedSyncAI(code, selectedLanguage, session?.problem || "");
  }, [code, selectedLanguage, session, debouncedSyncAI]);

  useEffect(() => {
    return () => {
      if (debouncedSyncRef.current) {
        debouncedSyncRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!channel) return;

    const handleStreamEvent = (event) => {
      try {
        if (event.type === "code_update" && event.user.id !== user?.id) {
          if (!isSyncing) return;
          const { language, code: newCode } = event;
          if (language && newCode !== undefined) {
            setCodeByLanguage(prev => ({ ...prev, [language]: newCode }));
          }
        }

        if (event.type === "language_change" && event.user.id !== user?.id) {
          const { language: newLang } = event;
          if (newLang) {
            setSelectedLanguage(newLang);
            setOutput(null);
          }
        }

        if (event.type === "control_handoff") {
          if (event.fromUserId === user?.id) {
            return;
          }
          
          const isForMe = event.toUserId === user?.id;
          
          if (isForMe) {
            setControlHandedTo(null);
            toast.success(`${event.fromUserName} handed control to you!`);
          } else {
            setControlHandedTo(event.toUserId);
            toast(`${event.fromUserName} handed control to ${event.toUserName || 'partner'}.`, { icon: '🕹️' });
          }
        }

        if (event.type === "code_run") {
          setIsRunning(true);
        }

        if (event.type === "run_results") {
          setIsRunning(false);
          setOutput(event.results);
        }
      } catch (error) {
        // Ignored
      }
    };

    channel.on("code_update", handleStreamEvent);
    channel.on("language_change", handleStreamEvent);
    channel.on("control_handoff", handleStreamEvent);
    channel.on("code_run", handleStreamEvent);
    channel.on("run_results", handleStreamEvent);

    return () => {
      try {
        channel.off("code_update", handleStreamEvent);
        channel.off("language_change", handleStreamEvent);
        channel.off("control_handoff", handleStreamEvent);
        channel.off("code_run", handleStreamEvent);
        channel.off("run_results", handleStreamEvent);
      } catch (error) {
        // Ignored
      }
    };
  }, [channel, user?.id, isSyncing]);

  useEffect(() => {
    if (!isSocketConnected || !onSocket) return;

    const handleControlUpdate = (data) => {
      try {
        const { currentControlUserId, fromUserName, toUserName } = data;
        setControlHandedTo(currentControlUserId);
        
        if (currentControlUserId === user?.id) {
          toast.success(`${fromUserName} handed control to you!`);
        } else if (currentControlUserId) {
          toast(`${fromUserName} handed control to ${toUserName}.`, { icon: '🕹️' });
        }
      } catch (error) {
        // Ignored
      }
    };

    const handleControlRelease = (data) => {
      try {
        const { releasedByUserName } = data;
        setControlHandedTo(null);
        toast(`${releasedByUserName} took back control.`, { icon: '🕹️' });
      } catch (error) {
        // Ignored
      }
    };

    onSocket('control:updated', handleControlUpdate);
    onSocket('control:released', handleControlRelease);

    return () => {
      try {
        offSocket('control:updated', handleControlUpdate);
        offSocket('control:released', handleControlRelease);
      } catch (error) {
        // Ignored
      }
    };
  }, [isSocketConnected, onSocket, offSocket, user?.id]);

  useEffect(() => {
    const handleMarkersUpdate = (e) => {
      try {
        if (e.detail && Array.isArray(e.detail.markers)) {
          setEditorMarkers(e.detail.markers);
        }
      } catch (error) {
        // Ignored
      }
    };

    const handleApplyCode = (e) => {
      try {
        if (e.detail && e.detail.code) {
          handleCodeChange(e.detail.code, true);
          toast.success("Code applied to editor!");
        }
      } catch (error) {
        toast.error("Failed to apply code to editor");
      }
    };

    window.addEventListener("arena-markers-update", handleMarkersUpdate);
    window.addEventListener("arena-apply-code", handleApplyCode);

    return () => {
      try {
        window.removeEventListener("arena-markers-update", handleMarkersUpdate);
        window.removeEventListener("arena-apply-code", handleApplyCode);
      } catch (error) {
        // Ignored
      }
    };
  }, [handleCodeChange]);

  const isReadOnly = useMemo(() => {
    if (isTranslating) return true;
    if (session?.isChallengeMode && !isHost) return true;

    // If control is handed to someone else (not me), I am read-only
    if (controlHandedTo && controlHandedTo !== user?.id) return true;

    return false;
  }, [isTranslating, session?.isChallengeMode, isHost, controlHandedTo, user?.id]);

  useEffect(() => {
    if (
      !authTokenReady ||
      !session ||
      !viewer?.isInvited ||
      isHost ||
      isParticipant ||
      autoJoinAttemptedRef.current
    ) {
      return;
    }

    if (!viewer.canJoin) {
      autoJoinAttemptedRef.current = true;
      return;
    }

    autoJoinAttemptedRef.current = true;
    joinSessionMutation.mutate(id, {
      onSuccess: () => {
        refetch();
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to join session");
      },
    });
  }, [authTokenReady, session, viewer, isHost, isParticipant, id, joinSessionMutation, refetch]);

  const handleToggleChallengeMode = () => {
    if (!isHost) return;
    updateSessionMutation.mutate({
      id,
      data: { isChallengeMode: !session.isChallengeMode }
    });
  };

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    const starterForTarget = problemData?.starterCode?.[newLang] || "";

    if (channel && chatClient?.userID) {
      channel.sendEvent({
        type: "language_change",
        language: newLang,
      }).catch(() => {});
    }

    setSelectedLanguage(newLang);
    setOutput(null);

    setCodeByLanguage(prev => {
      if (!prev[newLang] && starterForTarget) {
        return { ...prev, [newLang]: starterForTarget };
      }
      return prev;
    });
  };

  const handleRunCode = async () => {
    if (session?.isChallengeMode && !isHost) {
      toast.error("Code execution is restricted by the host.");
      return;
    }
    
    setIsRunning(true);
    setOutput(null);

    if (channel && chatClient?.userID) {
        channel.sendEvent({ type: "code_run" }).catch(() => {});
    }

    try {
        const result = await executeCode(selectedLanguage, code);
        setOutput(result);

        if (channel && chatClient?.userID) {
            channel.sendEvent({ 
                type: "run_results",
                results: result 
            }).catch(() => {});
        }
    } catch (err) {
        const errorResult = { 
            success: false, 
            error: err.message || "Execution failed",
            output: ""
        };
        setOutput(errorResult);
        
        if (channel && chatClient?.userID) {
            channel.sendEvent({ 
                type: "run_results",
                results: errorResult 
            }).catch(() => {});
        }
    } finally {
        setIsRunning(false);
    }
  };

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session? All participants will be notified.")) {
      endSessionMutation.mutate(id, { 
        onSuccess: () => navigate("/dashboard"),
        onError: (err) => {
          toast.error("Failed to end session");
        }
      });
    }
  };

  const handleJoinSession = () => {
    joinSessionMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Joined session successfully!");
        refetch();
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to join session");
      }
    });
  };

  const handleLeaveSession = () => {
    if (confirm("Are you sure you want to leave this session?")) {
      navigate("/dashboard");
    }
  };

  const handleSave = () => {
    let title = session.problem;
    const uniqueTitle = `${title} - ${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}`;
    createProblemMutation.mutate({
      title: uniqueTitle,
      difficulty: session.difficulty || 'easy',
      description: session.description || 'Saved from session',
      starterCode: codeByLanguage
    }, {
      onSuccess: () => {
        toast.success("Progress saved successfully!");
      },
      onError: (err) => {
        toast.error("Failed to save progress");
      }
    });
  };

  const handleSyncToggle = () => {
    const newState = !isSyncing;
    setIsSyncing(newState);
    if (!newState) setControlHandedTo(null);
  };

  if (!isUserLoaded) {
    return (
      <div className="h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center p-8 rounded-3xl border border-base-300 shadow-2xl bg-base-100">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <h2 className="text-2xl font-bold">Loading session...</h2>
          <p className="text-base-content/70 mt-2">Fetching your invite status and session details.</p>
        </div>
      </div>
    );
  }

  if (isSignedIn && isUserLoaded && !authReady) {
    return (
      <div className="h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center p-8 rounded-3xl border border-base-300 shadow-2xl bg-base-100">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <h2 className="text-2xl font-bold">Signing you in...</h2>
          <p className="text-base-content/70 mt-2">Waiting for Clerk to finish authentication.</p>
        </div>
      </div>
    );
  }

  if (isSignedIn && isUserLoaded && authReady && !authTokenReady) {
    return (
      <div className="h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center p-8 rounded-3xl border border-base-300 shadow-2xl bg-base-100 max-w-lg">
          <h2 className="text-2xl font-bold">Authentication incomplete</h2>
          <p className="text-base-content/70 mt-2">
            We could not obtain a secure session token. Sign out, sign back in with the invited Gmail account, then reopen this link.
          </p>
          <button type="button" className="btn btn-primary mt-6" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="h-screen bg-base-100 flex flex-col overflow-hidden relative">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-base-100 rounded-3xl shadow-2xl border border-base-300 p-10 text-center">
            <h1 className="text-3xl font-black mb-4">Sign in to access your invitation</h1>
            <p className="text-base-content/70 mb-6">
              Use the invited Gmail account to join this session. After signing in you will remain on this page.
            </p>
            <SignInButton
              mode="redirect"
              forceRedirectUrl={currentUrl}
              fallbackRedirectUrl={currentUrl}
              redirectUrl={currentUrl}
            >
              <button className="btn btn-primary btn-lg">Sign in with Google</button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  if (sessionLoadError) {
    const message =
      sessionLoadErrorInfo?.response?.data?.message || sessionLoadErrorInfo?.message || "Unable to load session.";

    return (
      <div className="h-screen bg-base-100 flex flex-col overflow-hidden relative">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-base-100 rounded-3xl shadow-2xl border border-base-300 p-10 text-center">
            <h1 className="text-3xl font-black mb-4">Session Load Failed</h1>
            <p className="text-base-content/70 mb-6">{message}</p>
            <button
              className="btn btn-primary"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingSession || !session) {
    return (
      <div className="h-screen bg-base-100 flex flex-col overflow-hidden relative">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <p className="text-lg font-semibold">Loading session...</p>
            <p className="text-base-content/60 mt-2">Please wait while we verify your invite and load the room.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleControlHandoff = () => {
    if (!otherUser || !otherUser.clerkId) {
        toast.error("Waiting for partner to join...");
        return;
    }

    if (!isSocketConnected) {
        toast.error("Connection lost. Cannot handoff control.");
        return;
    }

    const newControlTarget = controlHandedTo === otherUser.clerkId ? null : otherUser.clerkId;
    
    if (newControlTarget) {
        const success = handoffControl(
            newControlTarget,
            user?.id,
            user?.fullName || "Your partner",
            otherUser?.name || "partner"
        );
        
        if (success) {
            setControlHandedTo(newControlTarget);
            toast.success(`You handed control to ${otherUser.name}`);
        } else {
            toast.error("Failed to handoff control");
        }
    } else {
        const success = revokeControl(
            user?.id,
            user?.fullName || "Your partner"
        );
        
        if (success) {
            setControlHandedTo(null);
            toast.success("You took back control!");
        } else {
            toast.error("Failed to take back control");
        }
    }
  };

  // ==========================================
  // Render
  // ==========================================
  const showJoinPrompt = !isHost && !isParticipant && session?.status === "active";

  return (
    <div className="h-screen bg-base-100 flex flex-col overflow-hidden relative">
      <Navbar />

      {/* TOP HEADER AREA */}
      <div className="bg-base-100 border-b border-base-300 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
         <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black">{session?.problem}</h1>
            <span className={`badge ${getDifficultyBadgeClass(session?.difficulty)}`}>
               {session?.difficulty}
            </span>
            {session?.isChallengeMode && (
              <span className="badge badge-warning gap-1">
                <ShieldAlert className="size-3" /> Challenge Mode
              </span>
            )}
         </div>

          <div className="flex items-center gap-3">
            {isHost && (
               <button 
                 onClick={handleToggleChallengeMode}
                 className={`btn btn-sm gap-2 ${session?.isChallengeMode ? 'btn-warning' : 'btn-ghost border-base-300'}`}
               >
                 {session?.isChallengeMode ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
                 {session?.isChallengeMode ? "Restricted" : "Unrestricted"}
               </button>
            )}
            {isHost ? (
               <button 
                 onClick={handleEndSession}
                 className="btn btn-error btn-sm gap-2"
               >
                 <LogOutIcon className="size-4" />
                 End Session
               </button>
            ) : isParticipant ? (
               <button 
                 onClick={handleLeaveSession}
                 className="btn btn-outline btn-sm gap-2 hover:btn-error"
               >
                 <LogOutIcon className="size-4" />
                 Leave Session
               </button>
            ) : null}
          </div>
      </div>

      {showJoinPrompt && (
        <div className="px-4 pt-4 md:px-6">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-base-100 via-base-100 to-primary/10 shadow-lg">
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UsersIcon className="size-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">
                    {viewer?.isInvited ? "Session invite ready" : "Join this live session"}
                  </h2>
                  <p className="mt-1 text-sm text-base-content/70">
                    {viewer?.isInvited
                      ? `You were invited by ${session?.host?.name}. Join when you're ready — open slots are shared with everyone.`
                      : `This room is open. ${viewer?.slotsAvailable ?? 0} slot(s) left before the room is full.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-base-content/70">
                    <span className="rounded-full bg-base-200 px-3 py-1">
                      Problem: <strong className="text-base-content">{session?.problem}</strong>
                    </span>
                    <span className="rounded-full bg-base-200 px-3 py-1">
                      {viewer?.joinedCount ?? 0}/{viewer?.participantSlotsTotal ?? session?.maxParticipants ?? 1} joined · {viewer?.slotsAvailable ?? 0} open
                    </span>
                    {(viewer?.pendingInviteCount ?? 0) > 0 && (
                      <span className="rounded-full bg-warning/10 px-3 py-1 font-semibold text-warning">
                        {viewer.pendingInviteCount} invite(s) pending
                      </span>
                    )}
                    {viewer?.isFull && (
                      <span className="inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1.5 rounded-md bg-error text-error-content text-[10px] font-black uppercase">
                        Full
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleJoinSession}
                  disabled={joinSessionMutation.isPending || !viewer?.canJoin}
                  className={`btn btn-lg font-black shadow-xl ${viewer?.isFull ? "btn-error" : "btn-primary"}`}
                >
                  {joinSessionMutation.isPending ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      {viewer?.canJoin
                        ? viewer?.isInvited
                          ? "Accept & Join Now"
                          : "Join Session"
                        : "Session Full"}
                      <ArrowRightIcon className="size-5" />
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn btn-ghost btn-lg"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden pt-4">
        <PanelGroup orientation="horizontal">
          {/* LEFT PANEL - PROBLEM & EDITOR */}
          <Panel defaultSize={45} minSize={25}>
            <PanelGroup orientation="vertical">
              {/* PROBLEM DETAILS */}
              <Panel defaultSize={40} minSize={15}>
                <div className="h-full overflow-y-auto bg-base-200 p-4">
                  <div className="bg-base-100 rounded-2xl shadow-sm border border-base-300 p-6">
                    <h3 className="font-bold text-lg mb-2">Problem Statement</h3>
                    <p className="text-base-content/80 leading-relaxed">
                      {problemData?.description || session?.description || "No description provided."}
                    </p>
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="h-2 bg-base-300 hover:bg-primary cursor-row-resize flex items-center justify-center">
                 <div className="w-8 h-1 bg-base-content/20 rounded-full" />
              </PanelResizeHandle>
              <Panel defaultSize={60} minSize={20}>
                 <PanelGroup orientation="vertical">
                    <Panel defaultSize={70} minSize={30}>
                        <CodeEditorPanel
                          selectedLanguage={selectedLanguage}
                          code={code}
                          isRunning={isRunning}
                          isTranslating={isTranslating}
                          onLanguageChange={handleLanguageChange}
                          onCodeChange={handleCodeChange}
                          onRunCode={handleRunCode}
                          onSave={handleSave}
                          isSaving={createProblemMutation.isPending}
                          isRestricted={isReadOnly}
                          markers={editorMarkers}
                          isSyncing={isSyncing}
                          onSyncToggle={handleSyncToggle}
                          onControlHandoff={handleControlHandoff}
                          controlHandedTo={controlHandedTo}
                          isHost={isHost}
                          partnerName={otherUser?.name}
                        />
                    </Panel>
                    <PanelResizeHandle className="h-2 bg-base-300 hover:bg-primary cursor-row-resize flex items-center justify-center">
                       <div className="w-8 h-1 bg-base-content/20 rounded-full" />
                    </PanelResizeHandle>
                    <Panel defaultSize={30} minSize={10}>
                       <OutputPanel output={output} />
                    </Panel>
                 </PanelGroup>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary cursor-col-resize flex flex-col items-center justify-center">
             <div className="w-1 h-8 bg-base-content/20 rounded-full" />
          </PanelResizeHandle>

          {/* RIGHT PANEL - VIDEO ONLY */}
          <Panel defaultSize={55} minSize={25}>
            <div className="h-full bg-base-200 p-4 flex flex-col">
               <div className="flex-1 rounded-3xl overflow-hidden border border-base-300 shadow-lg bg-base-100">
                  {isInitializingCall ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2Icon className="size-12 animate-spin text-primary" />
                    </div>
                  ) : streamClient && call ? (
                    <StreamVideo client={streamClient}>
                      <StreamCall call={call}>
                        <VideoCallUI chatClient={chatClient} channel={channel} />
                      </StreamCall>
                    </StreamVideo>
                  ) : videoBlockedReason === "join_required" && showJoinPrompt ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <UsersIcon className="size-12 text-primary" />
                      <p className="text-lg font-bold">Join to start video</p>
                      <p className="text-sm text-base-content/70 max-w-xs">
                        Accept the session invite above to connect to the live video room with the host.
                      </p>
                      <button
                        type="button"
                        onClick={handleJoinSession}
                        disabled={joinSessionMutation.isPending || !viewer?.canJoin}
                        className="btn btn-primary btn-sm mt-2"
                      >
                        {joinSessionMutation.isPending ? "Joining..." : "Join & Enable Video"}
                      </button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <UsersIcon className="size-12 text-primary" />
                      <p className="text-lg font-bold">Video call unavailable</p>
                      <p className="text-sm text-base-content/70 max-w-xs">
                        {videoBlockedReason === "auth"
                          ? "Your sign-in session expired or is still loading. Please refresh and sign in again with the invited Gmail account."
                          : "We could not initialize the call context. Refresh the page or try again in a moment."}
                      </p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="btn btn-outline btn-sm mt-2"
                      >
                        Refresh
                      </button>
                    </div>
                  )}
               </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

class SessionPageErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[SessionPage ErrorBoundary caught an error]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-base-100 flex flex-col justify-center items-center p-6 text-center">
          <div className="max-w-2xl w-full p-8 bg-error/10 border border-error/25 rounded-3xl shadow-2xl text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-error/20 flex items-center justify-center text-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-error mb-2">Session Room Render Error</h2>
            <p className="text-base-content/70 mt-2 max-w-md mx-auto">
              CodeArena encountered a runtime rendering exception inside the live session component tree.
            </p>
            <div className="mt-6 text-left">
              <span className="text-xs uppercase font-bold text-base-content/40 tracking-wider">Error Details</span>
              <pre className="mt-1 text-xs bg-base-300 p-5 rounded-2xl text-error font-mono overflow-x-auto border border-base-300 max-h-60 whitespace-pre-wrap">
                {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
              </pre>
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <button 
                className="btn btn-primary px-6" 
                onClick={() => window.location.reload()}
              >
                Reload Room
              </button>
              <button 
                className="btn btn-ghost px-6" 
                onClick={() => window.location.href = "/dashboard"}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SessionPageWithErrorBoundary(props) {
  return (
    <SessionPageErrorBoundary>
      <SessionPage {...props} />
    </SessionPageErrorBoundary>
  );
}

