import { useEffect, useMemo, useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Loader2Icon, PlayIcon, Languages, SaveIcon } from "lucide-react";
import { LANGUAGE_CONFIG } from "../data/problems.js";

function CodeEditorPanel({
  selectedLanguage,
  code,
  isRunning,
  isTranslating = false,
  isSaving = false,
  onLanguageChange,
  onCodeChange,
  onRunCode,
  onSave,
  isRestricted = false,
  markers = [],
  isSyncing = true,
  onSyncToggle,
  onControlHandoff,
  controlHandedTo,
  isHost,
  partnerName,
}) {
  const [searchQuery, setSearchQuery] = useState(LANGUAGE_CONFIG[selectedLanguage].name);
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    setSearchQuery(LANGUAGE_CONFIG[selectedLanguage].name);
  }, [selectedLanguage]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current && markers.length > 0) {
      const model = editorRef.current.getModel();
      if (model) {
        const monacoMarkers = markers.map((marker) => ({
          startLineNumber: marker.startLineNumber || marker.line || 1,
          startColumn: marker.startColumn || 1,
          endLineNumber: marker.endLineNumber || marker.line || 1,
          endColumn: marker.endColumn || 100,
          message: marker.message || "",
          severity: marker.severity === "error" 
            ? monacoRef.current.MarkerSeverity.Error 
            : marker.severity === "warning"
            ? monacoRef.current.MarkerSeverity.Warning
            : marker.severity === "info"
            ? monacoRef.current.MarkerSeverity.Info
            : monacoRef.current.MarkerSeverity.Hint,
        }));
        monacoRef.current.editor.setModelMarkers(model, "arena-ai", monacoMarkers);
      }
    } else if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelMarkers(model, "arena-ai", []);
      }
    }
  }, [markers]);

  const filteredLanguages = useMemo(
    () =>
      Object.entries(LANGUAGE_CONFIG).filter(([, lang]) =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const handleSelectLanguage = (key, name) => {
    onLanguageChange({ target: { value: key } });
    setSearchQuery(name);
    setIsFocused(false);
  };

  return (
    <div className="h-full bg-base-300 flex flex-col relative">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-100 border-t border-base-300">
        <div className="flex items-center gap-3 relative">
          <img
            src={LANGUAGE_CONFIG[selectedLanguage].icon}
            alt={LANGUAGE_CONFIG[selectedLanguage].name}
            className="size-6"
          />
          <div className="w-40">
            <input
              type="text"
              className="input input-sm input-bordered w-full"
              placeholder="Search language"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
              disabled={isTranslating || isRestricted}
            />
            {isFocused && filteredLanguages.length > 0 && (
              <div className="absolute z-20 mt-1 w-40 max-h-44 overflow-y-auto rounded-lg border border-base-300 bg-base-100 shadow-lg">
                {filteredLanguages.map(([key, lang]) => (
                  <button
                    key={key}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-base-200"
                    onMouseDown={() => handleSelectLanguage(key, lang.name)}
                    disabled={isTranslating || isRestricted}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Give Control Button */}
          {partnerName && (
            <button
              onClick={onControlHandoff}
              className={`btn btn-sm gap-2 border-none transition-all duration-300 ${
                controlHandedTo 
                ? "bg-warning/10 text-warning hover:bg-warning/20" 
                : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              <div className={`size-2 rounded-full ${controlHandedTo ? "bg-warning" : "bg-primary"}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {controlHandedTo ? "Take Back Control" : "Give Control"}
              </span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-primary transition-colors"
              disabled={isSaving || isTranslating || isRestricted}
            >
              {isSaving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SaveIcon className="size-4" />
              )}
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              onClick={onRunCode}
              className="btn btn-primary btn-sm gap-2 px-4 shadow-lg shadow-primary/20"
              disabled={isRunning || isRestricted || isTranslating}
            >
              {isRunning ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <PlayIcon className="size-4" />
                  Run Code
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* EDITOR */}
      <div className="flex-1 relative">
        <Editor
          height={"100%"}
          language={LANGUAGE_CONFIG[selectedLanguage].monacoLang}
          value={code}
          onChange={onCodeChange}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            fontSize: 16,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            minimap: { enabled: false },
            readOnly: isTranslating || isRestricted,
          }}
        />
        
        {isTranslating && (
          <div className="absolute inset-0 bg-base-100/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 p-6 bg-base-100 rounded-2xl shadow-lg border border-base-300">
              <div className="p-3 bg-primary/10 rounded-full">
                <Languages className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-base-content">Translating Code...</p>
                <p className="text-sm text-base-content/60 mt-1">AI is converting your code to {LANGUAGE_CONFIG[selectedLanguage].name}</p>
              </div>
              <div className="w-48 h-2 bg-base-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse rounded-full" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeEditorPanel;
