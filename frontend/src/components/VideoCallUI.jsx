import {
  CallControls,
  CallingState,
  SpeakerLayout,
  useCallStateHooks,
  ParticipantView,
} from "@stream-io/video-react-sdk";
import { Loader2Icon, MessageSquareIcon, UsersIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Channel, Chat, MessageComposer, MessageList, Thread, Window } from "stream-chat-react";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "stream-chat-react/dist/css/index.css";

function VideoCallUI({ chatClient, channel }) {
  const navigate = useNavigate();
  const { useCallCallingState, useParticipantCount } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (callingState === CallingState.JOINING) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2Icon className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-lg">Joining call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4 relative str-video group/video">
      <div className="flex-1 flex flex-col relative overflow-hidden rounded-3xl border border-base-300 shadow-2xl bg-base-300/50">
        
        {/* TOP FLOATING OVERLAY: Participant Count & Status */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-2xl shadow-xl">
            <div className="relative">
              <UsersIcon className="size-3.5 text-primary" />
              <span className="absolute -top-1 -right-1 size-2 bg-success rounded-full animate-pulse border border-black" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-wider">
              {participantCount} Live
            </span>
          </div>
        </div>

        {/* TOP RIGHT: Chat Toggle */}
        {chatClient && channel && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`btn btn-circle btn-sm border-white/10 shadow-xl transition-all ${
                isChatOpen 
                ? "bg-primary text-white hover:bg-primary/80" 
                : "bg-black/40 backdrop-blur-md text-white hover:bg-black/60"
              }`}
            >
              <MessageSquareIcon className="size-4" />
            </button>
          </div>
        )}

        {/* MAIN VIDEO AREA */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {/* Custom robust layout with identity overlays */}
          <SpeakerLayout 
            ParticipantViewUI={(props) => (
              <div className="relative w-full h-full">
                <ParticipantView {...props} />
                <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl pr-4">
                  <div className="size-8 rounded-xl overflow-hidden border border-white/20">
                    <img 
                      src={props.participant.image} 
                      alt={props.participant.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${props.participant.name}` }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/50 font-black uppercase tracking-widest leading-none">Participant</span>
                    <span className="text-sm text-white font-bold truncate max-w-[120px]">{props.participant.name}</span>
                  </div>
                  {props.participant.isLocal && <span className="badge badge-primary badge-xs ml-2">You</span>}
                </div>
              </div>
            )}
          />
        </div>

        {/* BOTTOM FLOATING OVERLAY: Call Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl scale-90 sm:scale-100">
            <CallControls onLeave={() => navigate("/dashboard")} />
          </div>
        </div>
      </div>

      {/* CHAT SIDEBAR (Glassmorphic) */}
      {chatClient && channel && (
        <div
          className={`flex flex-col rounded-3xl shadow-2xl overflow-hidden bg-base-100/40 backdrop-blur-xl border border-base-300 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isChatOpen ? "w-85 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-10"
          }`}
        >
          {isChatOpen && (
            <>
              <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-primary rounded-full animate-pulse" />
                  <h3 className="font-black text-xs uppercase tracking-widest opacity-60">Session Chat</h3>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden arena-session-chat">
                <Chat client={chatClient} theme="str-chat__theme-dark">
                  <Channel channel={channel}>
                    <Window>
                      <MessageList />
                      <MessageComposer />
                    </Window>
                    <Thread />
                  </Channel>
                </Chat>
              </div>
            </>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .arena-session-chat .str-chat { height: 100%; }
        .arena-session-chat .str-chat__ul { background: transparent !important; }
        .arena-session-chat .str-chat__message-input { background: rgba(0,0,0,0.2) !important; border-top: 1px solid rgba(255,255,255,0.05) !important; }
        .arena-session-chat .str-chat__message-bubble { border-radius: 1rem !important; font-size: 13px !important; }
      `}} />
    </div>
  );
}

export default VideoCallUI;