import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PROBLEMS } from "../data/problems";
import Navbar from "../components/Navbar";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import ProblemDescription from "../components/ProblemDescription.jsx";
import OutputPanel from "../components/OutputPanel.jsx";
import CodeEditorPanel from "../components/CodeEditor.jsx";
import { executeCode } from "../lib/codeExecution.js";
import { useProblemById, useProblems } from "../hooks/useProblems";
import { useSaveProgress, useSavedProgress } from "../hooks/useSubmissions";

import { 
  Loader2Icon,
  SearchIcon 
} from "lucide-react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: problemDataResult, isLoading } = useProblemById(id);
  const { data: allProblemsData } = useProblems();
  
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeByLanguage, setCodeByLanguage] = useState({});
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorMarkers, setEditorMarkers] = useState([]);

  // 🛡️ Senior Dev Logic: Determine if it's a library problem or a database problem
  const currentProblem = useMemo(() => {
    // If it's a static library problem
    if (id && PROBLEMS[id]) return PROBLEMS[id];
    // If it's a database problem
    return problemDataResult?.problem;
  }, [id, problemDataResult]);

  const code = codeByLanguage[selectedLanguage] ?? "";

  // Sync code with AI widget
  const syncCodeWithAI = useCallback((newCode, lang, problem) => {
    window.dispatchEvent(new CustomEvent("arena-code-update", {
      detail: { code: newCode, language: lang, problem: problem }
    }));
  }, []);

  const { data: savedData, isLoading: isSavedLoading } = useSavedProgress(id, selectedLanguage);
  const saveProgressMutation = useSaveProgress();

  // 🛡️ Senior Dev Fix: Initialize code map when problem changes or saved data arrives
  // Split into two effects for better control
  useEffect(() => {
    if (currentProblem) {
      const defaultLang = "javascript";
      const starter = currentProblem.starterCode?.[defaultLang] ?? "";
      setCodeByLanguage(starter ? { [defaultLang]: starter } : {});
      setSelectedLanguage(defaultLang);
      setOutput(null);
    }
  }, [currentProblem]);

  // 🛡️ Senior Dev Fix: Load saved progress separately after initial code is set
  useEffect(() => {
    if (savedData?.submission?.code && currentProblem) {
      setCodeByLanguage(prev => ({
        ...prev,
        [selectedLanguage]: savedData.submission.code
      }));
    }
  }, [savedData, selectedLanguage, currentProblem]);

  // Sync code with AI widget whenever code changes
  useEffect(() => {
    syncCodeWithAI(code, selectedLanguage, currentProblem?.title || "");
  }, [code, selectedLanguage, currentProblem, syncCodeWithAI]);

  // Listen for markers from AI widget
  useEffect(() => {
    const handleMarkersUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail.markers)) {
        setEditorMarkers(e.detail.markers);
      }
    };
    window.addEventListener("arena-markers-update", handleMarkersUpdate);
    return () => window.removeEventListener("arena-markers-update", handleMarkersUpdate);
  }, []);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    if (newLang === selectedLanguage) return;

    setCodeByLanguage(prev => ({
      ...prev,
      [selectedLanguage]: code,
    }));
    setSelectedLanguage(newLang);
    setOutput(null);
  };

  const handleCodeChange = (value) => {
    setCodeByLanguage(prev => ({
      ...prev,
      [selectedLanguage]: value
    }));
  };

  const handleSaveProgress = async () => {
    if (!id || !selectedLanguage || !code) return;
    setIsSaving(true);
    try {
      await saveProgressMutation.mutateAsync({
        problemId: id,
        problemTitle: currentProblem?.title || "Untitled Problem",
        language: selectedLanguage,
        code: code,
        status: "draft"
      });
      navigate("/problems"); // 🚀 Senior Dev: Redirect on solo ProblemPage
    } finally {
      setIsSaving(false);
    }
  };

  const handleProblemChange = (newProblemId) => navigate(`/problem/${newProblemId}`);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 250,
      origin: { x: 0.2, y: 0.6 },
    });

    confetti({
      particleCount: 80,
      spread: 250,
      origin: { x: 0.8, y: 0.6 },
    });
  };

  const normalizeOutput = (output) => {
    // 🛡️ Senior Dev Fix: Handle undefined/null output
    if (!output) return "";
    // normalize output for comparison (trim whitespace, handle different spacing)
    return output
      .trim()
      .split("\n")
      .map((line) =>
        line
          .trim()
          // remove spaces after [ and before ]
          .replace(/\[\s+/g, "[")
          .replace(/\s+\]/g, "]")
          // normalize spaces around commas to single space after comma
          .replace(/\s*,\s*/g, ",")
      )
      .filter((line) => line.length > 0)
      .join("\n");
  };

  const checkIfTestsPassed = (actualOutput, expectedOutput) => {
    const normalizedActual = normalizeOutput(actualOutput);
    const normalizedExpected = normalizeOutput(expectedOutput);

    return normalizedActual == normalizedExpected;
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);

    const result = await executeCode(selectedLanguage, code);
    setOutput(result);
    setIsRunning(false);

    // check if code executed successfully and matches expected output

    if (result.success) {
      // 🛡️ Senior Dev Fix: Handle undefined expectedOutput
      const expectedOutput = currentProblem.expectedOutput?.[selectedLanguage];
      const testsPassed = checkIfTestsPassed(result.output, expectedOutput);

      if (testsPassed) {
        triggerConfetti();
        toast.success("All tests passed! Great job!");
      }
    } else {
      toast.error("Code execution failed!");
    }
  };

  return (
    <div className="h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1">
        <PanelGroup orientation="horizontal">
          {/* left panel- problem desc */}
          <Panel defaultSize={40} minSize={30}>
            {isLoading ? (
               <div className="h-full flex items-center justify-center bg-base-200">
                  <Loader2Icon className="size-10 animate-spin text-primary" />
               </div>
            ) : (
              <ProblemDescription
                problem={currentProblem}
                currentProblemId={id}
                onProblemChange={handleProblemChange}
                allProblems={[...Object.values(PROBLEMS), ...(allProblemsData?.problems || [])]}
              />
            )}
          </Panel>

          <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />

          {/* right panel- code editor & output */}
          <Panel defaultSize={60} minSize={30}>
            <PanelGroup orientation="vertical">
              {/* Top panel - Code editor */}
              <Panel defaultSize={70} minSize={30}>
                <CodeEditorPanel
                  key={selectedLanguage}
                  selectedLanguage={selectedLanguage}
                  code={code}
                  isRunning={isRunning}
                  isSaving={isSaving}
                  onLanguageChange={handleLanguageChange}
                  onCodeChange={handleCodeChange}
                  onRunCode={handleRunCode}
                  onSave={handleSaveProgress}
                  markers={editorMarkers}
                />
              </Panel>

              <PanelResizeHandle className="h-2 bg-base-300 hover:bg-primary transition-colors cursor-row-resize" />

              {/* Bottom panel - Output Panel*/}

              <Panel defaultSize={30} minSize={30}>
                <OutputPanel output={output} />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default ProblemPage;
