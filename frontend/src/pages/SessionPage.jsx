import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import CodeEditorPanel from "../components/codeEditor.jsx";
import OutputPanel from "../components/outputPanel.jsx";
import { debounce } from "lodash-es";

import useStreamClient from "../hooks/useStreamClient.js";
import useSocket from "../hooks/useSocket.js";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI.jsx";
import toast from "react-hot-toast";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [editorMarkers, setEditorMarkers] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [controlHandedTo, setControlHandedTo] = useState(null);

  const { data: sessionData, isLoading: loadingSession, refetch } = useSessionById(id);
  const updateSessionMutation = useUpdateSession();
  
  const { data: problemResult } = useProblemById(sessionData?.session?.problemId);
  const problemData = problemResult?.problem;

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();
  const createProblemMutation = useCreateProblem();

  const session = sessionData?.session;
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participant?.clerkId === user?.id;

  const { 
    socket, 
    isConnected: isSocketConnected, 
    handoffControl, 
    revokeControl,
    on: onSocket,
    off: offSocket
  } = useSocket(id, user?.id, isHost || isParticipant);

  const { call, channel, chatClient, isInitializingCall, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant
  );

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeByLanguage, setCodeByLanguage] = useState({});
  const code = codeByLanguage[selectedLanguage] || "";

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

  const handleToggleChallengeMode = () => {
    if (!isHost) return;
    updateSessionMutation.mutate({
      id,
      data: { isChallengeMode: !session.isChallengeMode }
    });
  };

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    const oldLang = selectedLanguage;
    const sourceCode = codeByLanguage[oldLang] || "";
    const targetExistingCode = codeByLanguage[newLang] || "";
    const starterForTarget = problemData?.starterCode?.[newLang] || "";
    const starterForSource = problemData?.starterCode?.[oldLang] || "";

    if (channel && chatClient?.userID) {
      channel.sendEvent({
        type: "language_change",
        language: newLang,
      }).catch(() => {});
    }

    setSelectedLanguage(newLang);
    setOutput(null);

    const hasMeaningfulSource = sourceCode.trim().length > 0 && sourceCode.trim() !== starterForSource.trim();
    const targetIsEmptyOrStarter = !targetExistingCode.trim() || targetExistingCode.trim() === starterForTarget.trim();

    if (hasMeaningfulSource && targetIsEmptyOrStarter && oldLang !== newLang) {
      setIsTranslating(true);
      try {
        const { translatedCode } = await aiApi.translateCode(
          sourceCode,
          oldLang,
          newLang,
          session?.problem || problemData?.description || ""
        );
        setCodeByLanguage(prev => ({
          ...prev,
          [newLang]: translatedCode
        }));
        toast.success(`Translated from ${LANGUAGE_CONFIG[oldLang].name} to ${LANGUAGE_CONFIG[newLang].name}`);
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || "Unknown error";
        toast.error(`Translation failed: ${errorMsg}`);
        setCodeByLanguage(prev => {
          if (!prev[newLang] && starterForTarget) {
            return { ...prev, [newLang]: starterForTarget };
          }
          return prev;
        });
      } finally {
        setIsTranslating(false);
      }
    } else {
      setCodeByLanguage(prev => {
        if (!prev[newLang] && starterForTarget) {
          return { ...prev, [newLang]: starterForTarget };
        }
        return prev;
      });
    }
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

  const handleControlHandoff = () => {
    const otherUser = isHost ? session?.participant : session?.host;
    
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

  const isReadOnly = useMemo(() => {
    if (isTranslating) return true;
    if (session?.isChallengeMode && !isHost) return true;

    // If control is handed to someone else (not me), I am read-only
    if (controlHandedTo && controlHandedTo !== user?.id) return true;

    return false;
  }, [isTranslating, session?.isChallengeMode, isHost, controlHandedTo, user?.id]);

  // ==========================================
  // Render
  // ==========================================
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

      <div className="flex-1 overflow-hidden">
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
                          partnerName={isHost ? session?.participant?.name : session?.host?.name}
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
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <UsersIcon className="size-12 text-primary" />
                      <p className="text-lg font-bold">Video call unavailable</p>
                      <p className="text-sm text-base-content/70 max-w-xs">
                        We could not initialize the call context. Refresh the page or try again in a moment.
                      </p>
                    </div>
                  )}
               </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* JOIN OVERLAY */}
      {!isHost && !isParticipant && session?.status === "active" && (
        <div className="absolute inset-0 z-[100] bg-base-300/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-base-100 rounded-3xl shadow-2xl border border-base-300 p-8 text-center space-y-6">
            <div className="size-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <UsersIcon className="size-10 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-black mb-2">Join Session?</h2>
              <p className="text-base-content/60">
                You are invited to join <strong>{session?.host?.name}'s</strong> session to solve <strong>{session?.problem}</strong>.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={handleJoinSession}
                disabled={joinSessionMutation.isPending}
                className="btn btn-primary btn-lg font-black shadow-xl"
              >
                {joinSessionMutation.isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">Accept & Join Now <ArrowRightIcon className="size-5" /></span>
                )}
              </button>
              <button 
                onClick={() => navigate("/dashboard")}
                className="btn btn-ghost"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionPage;