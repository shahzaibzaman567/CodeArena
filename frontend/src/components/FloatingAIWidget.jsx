import { useState, useRef, useEffect } from "react";
import { Sparkles, X, MessageSquare, Send, Bot, User, Loader2, Code2, Lightbulb, AlertCircle, CheckCircle2 } from "lucide-react";
import { aiApi } from "../api/ai";

function FloatingAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: -1, y: -1 }); // -1 = use default bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "👋 Hi! I'm Arena AI, your coding assistant. I can help you with:\n\n• Code suggestions & debugging\n• Explaining CodeArena features\n• Answering questions about coding\n\nHow can I help you today?\n\n⚠️ Please write some code first so I can analyze it!" 
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState("chat"); // chat | analyze
  const [currentCode, setCurrentCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  const [currentProblem, setCurrentProblem] = useState("");
  const [size, setSize] = useState({ width: 420, height: 600 });
  const [isResizing, setIsResizing] = useState(null); // null | 'top' | 'left' | 'both'
  const widgetRef = useRef(null);
  const iconRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Resize handlers
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(direction);
  };

  const handleResizeMove = (e) => {
    if (!isResizing) return;

    const rect = widgetRef.current.getBoundingClientRect();
    let newWidth = size.width;
    let newHeight = size.height;

    if (isResizing === 'left' || isResizing === 'both') {
      newWidth = rect.right - e.clientX;
    }
    if (isResizing === 'top' || isResizing === 'both') {
      newHeight = rect.bottom - e.clientY;
    }

    // Constraints
    newWidth = Math.max(320, Math.min(newWidth, window.innerWidth - 40));
    newHeight = Math.max(400, Math.min(newHeight, window.innerHeight - 100));

    setSize({ width: newWidth, height: newHeight });
  };

  const handleResizeEnd = () => {
    setIsResizing(null);
  };

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 
        isResizing === 'both' ? 'nwse-resize' : 
        isResizing === 'top' ? 'ns-resize' : 'ew-resize';
        
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.body.style.cursor = 'default';
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing, size]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for code changes from other components
  useEffect(() => {
    const handleCodeUpdate = (e) => {
      if (e.detail) {
        setCurrentCode(e.detail.code || "");
        setCurrentLanguage(e.detail.language || "javascript");
        setCurrentProblem(e.detail.problem || "");
      }
    };
    window.addEventListener("arena-code-update", handleCodeUpdate);
    return () => window.removeEventListener("arena-code-update", handleCodeUpdate);
  }, []);

  // Inject close (X) button into Stream Chat image lightbox
  useEffect(() => {
    const injectCloseButton = (modal) => {
      if (modal.querySelector("._arena-close-btn")) return; // already injected
      const btn = document.createElement("button");
      btn.className = "_arena-close-btn";
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      Object.assign(btn.style, {
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: "99999",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "50%",
        width: "44px",
        height: "44px",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s",
      });
      btn.onmouseenter = () => { btn.style.background = "rgba(0,0,0,0.85)"; };
      btn.onmouseleave = () => { btn.style.background = "rgba(0,0,0,0.6)"; };
      btn.onclick = () => {
        // Click the modal backdrop to close it
        const backdrop = document.querySelector(".str-chat__image-gallery-overlay, .str-chat__modal__inner, [class*=\"modalWrapper\"], [class*=\"lightbox\"]");
        if (backdrop) backdrop.click();
        modal.remove();
      };
      modal.appendChild(btn);
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          // Stream Chat opens modals with these classes
          const modal = node.matches?.(".str-chat__modal, [class*=\"gallery\"], [class*=\"lightbox\"]")
            ? node
            : node.querySelector?.(".str-chat__modal, [class*=\"gallery\"], [class*=\"lightbox\"]");
          if (modal) injectCloseButton(modal);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onEscape = (e) => {
      if (e.key !== "Escape") return;
      const modal = document.querySelector(".str-chat__modal, [class*=\"gallery\"], [class*=\"lightbox\"]");
      if (modal) {
        const backdrop = modal.querySelector(".str-chat__image-gallery-overlay, [class*=\"backdrop\"]");
        if (backdrop) backdrop.click(); else modal.remove();
      }
    };
    window.addEventListener("keydown", onEscape);

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  // Drag handlers with boundary constraints
  const handleMouseDown = (e) => {
    if (isOpen) return; // Don't drag when chat is open
    setIsDragging(true);
    const rect = iconRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const iconSize = 56; // w-14 = 56px
    const margin = 8;
    
    let x = e.clientX - dragOffset.x;
    let y = e.clientY - dragOffset.y;
    
    // Constrain to viewport (keep below navbar ~64px, above bottom, within left/right)
    const maxX = window.innerWidth - iconSize - margin;
    const maxY = window.innerHeight - iconSize - margin;
    const minY = 64 + margin; // Below navbar
    
    x = Math.max(margin, Math.min(x, maxX));
    y = Math.max(minY, Math.min(y, maxY));
    
    setPosition({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keep widget in bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      if (position.x === -1) return; // Stay at default bottom-right
      
      const iconSize = 56;
      const margin = 8;
      const maxX = window.innerWidth - iconSize - margin;
      const maxY = window.innerHeight - iconSize - margin;
      const minY = 64 + margin;

      setPosition(prev => ({
        x: Math.max(margin, Math.min(prev.x, maxX)),
        y: Math.max(minY, Math.min(prev.y, maxY)),
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Get AI suggestions/answer
      const data = await aiApi.getCodeSuggestions(
        currentCode || "",
        currentProblem || "General Coding",
        currentLanguage,
        userMessage
      );
      
      const responseContent = formatAIResponse(data.suggestion);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseContent },
      ]);

      // Check if user is asking for code issues to dispatch markers
      const isCodeHelp = userMessage.toLowerCase().includes("error") ||
                        userMessage.toLowerCase().includes("bug") ||
                        userMessage.toLowerCase().includes("issue") ||
                        userMessage.toLowerCase().includes("fix");

      if (isCodeHelp && currentCode) {
        const markers = parseMarkersFromResponse(responseContent, currentCode);
        dispatchMarkers(markers);
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg = error.response?.data?.message || "❌ Sorry, I encountered an error. Please check if the AI API is configured correctly.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAIResponse = (suggestion) => {
    if (!suggestion) return "I don't have a specific suggestion right now.";
    
    // If it's a string, just return it (it might be a general answer)
    if (typeof suggestion === "string") return suggestion;

    let response = "";
    if (suggestion.suggestion) response += `💡 **Suggestion:**\n${suggestion.suggestion}\n\n`;
    if (suggestion.hint) response += `🔍 **Hint:**\n${suggestion.hint}\n\n`;
    if (suggestion.error) response += `⚠️ **Error Analysis:**\n${suggestion.error}\n\n`;
    if (suggestion.improvement) response += `✅ **Improvement:**\n${suggestion.improvement}\n\n`;
    
    return response.trim() || (suggestion.suggestion || "I analyzed your request but don't have specific feedback.");
  };

  // Parse AI response to generate editor markers
  const parseMarkersFromResponse = (responseText, code) => {
    const markers = [];
    if (!responseText || !code) return markers;

    const lines = code.split('\n');
    
    const lineRegex = /(?:line|Line)\s*(\d+)[,:]?\s*(.+?)(?=\n|$)/gi;
    let match;
    while ((match = lineRegex.exec(responseText)) !== null) {
      const lineNum = parseInt(match[1]);
      const message = match[2].trim();
      if (lineNum > 0 && lineNum <= lines.length) {
        markers.push({ line: lineNum, message: message, severity: "error" });
      }
    }

    const errorRegex = /(?:error|bug|issue|problem).*?(?:at|on|in)\s+(?:line\s*)?(\d+)/gi;
    while ((match = errorRegex.exec(responseText)) !== null) {
      const lineNum = parseInt(match[1]);
      if (lineNum > 0 && lineNum <= lines.length && !markers.find(m => m.line === lineNum)) {
        markers.push({ line: lineNum, message: "Potential issue detected", severity: "error" });
      }
    }

    return markers;
  };

  const dispatchMarkers = (markers) => {
    window.dispatchEvent(new CustomEvent("arena-markers-update", { detail: { markers } }));
  };

  const handleQuickAction = async (action) => {
    if (!currentCode) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Please write some code first so I can analyze it!" },
      ]);
      return;
    }

    setIsLoading(true);
    let userMessage = "";

    switch (action) {
      case "explain":
        userMessage = "Explain this code to me";
        break;
      case "debug":
        userMessage = "Find bugs and errors in this code";
        break;
      case "improve":
        userMessage = "How can I improve this code?";
        break;
      case "complexity":
        userMessage = "Analyze time and space complexity";
        break;
      case "translate":
        userMessage = "Translate this code to another language (e.g. Python or Java)";
        break;
      default:
        userMessage = action;
    }

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const data = await aiApi.getCodeSuggestions(
        currentCode,
        currentProblem || "Coding problem",
        currentLanguage,
        userMessage
      );
      const responseContent = formatAIResponse(data.suggestion);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseContent },
      ]);

      // Dispatch markers for debug action
      if (action === "debug" && currentCode) {
        const markers = parseMarkersFromResponse(responseContent, currentCode);
        dispatchMarkers(markers);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Failed to analyze code. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Sparkles Icon - Draggable */}
      {!isOpen && (
        <div
          ref={iconRef}
          className="fixed z-50 cursor-move select-none"
          style={{
            right: position.x < 0 ? "24px" : "auto",
            bottom: position.y < 0 ? "24px" : "auto",
            left: position.x >= 0 ? `${position.x}px` : "auto",
            top: position.y >= 0 ? `${position.y}px` : "auto",
          }}
          onMouseDown={handleMouseDown}
          onClick={() => !isDragging && setIsOpen(true)}
        >
          <div className="group relative">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95">
              <Sparkles className="w-7 h-7 text-white animate-pulse" />
            </div>
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-base-100 text-base-content px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-base-300">
              Arena AI
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-base-100 rotate-45 border-r border-t border-base-300"></div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={widgetRef}
          className="fixed right-4 bottom-4 z-50 bg-base-100 rounded-2xl shadow-2xl border border-base-300 flex flex-col overflow-hidden transition-all duration-75"
          style={{ width: `${size.width}px`, height: `${size.height}px` }}
        >
          {/* Resize Handles */}
          <div 
            className="absolute top-0 left-0 w-full h-1 cursor-ns-resize hover:bg-primary/30 z-[60]"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
          <div 
            className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-primary/30 z-[60]"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
          <div 
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize hover:bg-primary/30 z-[60] rounded-tl-xl"
            onMouseDown={(e) => handleResizeStart(e, 'both')}
          />
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Arena AI</h3>
                <p className="text-white/70 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-3 border-b border-base-200 bg-base-50 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => handleQuickAction("explain")}
                className="btn btn-xs btn-outline gap-1 whitespace-nowrap"
                disabled={isLoading}
              >
                <Code2 className="w-3 h-3" />
                Explain
              </button>
              <button
                onClick={() => handleQuickAction("debug")}
                className="btn btn-xs btn-outline gap-1 whitespace-nowrap"
                disabled={isLoading}
              >
                <AlertCircle className="w-3 h-3" />
                Debug
              </button>
              <button
                onClick={() => handleQuickAction("improve")}
                className="btn btn-xs btn-outline gap-1 whitespace-nowrap"
                disabled={isLoading}
              >
                <Lightbulb className="w-3 h-3" />
                Improve
              </button>
              <button
                onClick={() => handleQuickAction("complexity")}
                className="btn btn-xs btn-outline gap-1 whitespace-nowrap"
                disabled={isLoading}
              >
                <CheckCircle2 className="w-3 h-3" />
                Complexity
              </button>
              <button
                onClick={() => handleQuickAction("translate")}
                className="btn btn-xs btn-outline gap-1 whitespace-nowrap"
                disabled={isLoading}
              >
                <MessageSquare className="w-3 h-3" />
                Translate
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    message.role === "user"
                      ? "bg-primary text-primary-content"
                      : "bg-secondary text-secondary-content"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-primary text-primary-content rounded-tr-sm"
                      : "bg-base-200 text-base-content rounded-tl-sm border border-base-300"
                  }`}
                >
                  {message.content.split("\n").map((line, i) => (
                    <p key={i} className={line.startsWith("•") ? "ml-2" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-content flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-base-200 border border-base-300 rounded-2xl rounded-tl-sm p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-base-200 bg-base-100 shrink-0">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Ask Arena AI anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="input input-bordered w-full pr-10 focus:outline-none focus:border-primary"
                  disabled={isLoading}
                />
                <MessageSquare className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="btn btn-primary gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-base-content/40 mt-2 text-center">
              Arena AI knows about CodeArena • Coding • Debugging
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingAIWidget;

