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
import CodeEditorPanel from "../components/codeEditor.jsx";
import { executeCode } from "../lib/codeExecution.js";
import { useProblemById, useProblems } from "../hooks/useProblems";
import { useSaveProgress, useSavedProgress } from "../hooks/useSubmissions";
import { aiApi } from "../api/ai.js";
import { LANGUAGE_CONFIG } from "../data/problems.js";

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
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorMarkers, setEditorMarkers] = useState([]);

  // 🛡️ Senior Dev Logic: Determine if it's a library problem or a database problem
  const currentProblem = useMemo(() => {
    // If it's a static library problem
    if (id && PROBLEMS[id]) return PROBLEMS[id];
    // If it's a database problem
    return problemDataResult?.problem;
  }, [id, problemDataResult]);

  const code = codeByLanguage[selectedLanguage] || currentProblem?.starterCode?.[selectedLanguage] || "";

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
      const initialMap = {};
      const languages = ["javascript", "python", "java", "cpp", "csharp"];
      languages.forEach(lang => {
        initialMap[lang] = currentProblem.starterCode?.[lang] || "";
      });

      setCodeByLanguage(initialMap);
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

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    const oldLang = selectedLanguage;
    const sourceCode = codeByLanguage[oldLang] || "";
    const targetExistingCode = codeByLanguage[newLang] || "";
    const starterForTarget = currentProblem?.starterCode?.[newLang] || "";
    const starterForSource = currentProblem?.starterCode?.[oldLang] || "";

    setSelectedLanguage(newLang);
    setOutput(null);
    
    // 🛡️ Senior Dev Logic: Auto-translate if there's meaningful code
    const hasMeaningfulSource = sourceCode.trim().length > 0 && sourceCode.trim() !== starterForSource.trim();
    const targetIsEmptyOrStarter = !targetExistingCode.trim() || targetExistingCode.trim() === starterForTarget.trim();

    if (hasMeaningfulSource && targetIsEmptyOrStarter && oldLang !== newLang) {
      setIsTranslating(true);
      try {
        console.log(`[Translation] Translating from ${oldLang} to ${newLang}, source length: ${sourceCode.length}`);
        const { translatedCode } = await aiApi.translateCode(
          sourceCode,
          oldLang,
          newLang,
          currentProblem?.title || ""
        );
        console.log(`[Translation] Success! Translated code length: ${translatedCode?.length || 0}`);
        setCodeByLanguage(prev => ({
          ...prev,
          [newLang]: translatedCode
        }));
        toast.success(`Translated from ${LANGUAGE_CONFIG[oldLang].name} to ${LANGUAGE_CONFIG[newLang].name}`);
      } catch (err) {
        console.error("[Translation] Auto-translation failed:", err);
        const errorMsg = err.response?.data?.message || err.message || "Unknown error";
        toast.error(`Translation failed: ${errorMsg}`);
        // Fallback to starter code
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
      // Ensure code exists for this language, fallback to starter code
      setCodeByLanguage(prev => {
        if (!prev[newLang] && starterForTarget) {
          return { ...prev, [newLang]: starterForTarget };
        }
        return prev;
      });
    }
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
      } else {
        toast.error("Tests failed. Check your output!");
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
                  selectedLanguage={selectedLanguage}
                  code={code}
                  isRunning={isRunning}
                  isTranslating={isTranslating}
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
