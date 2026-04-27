import { useState } from "react";
import { Loader, Lightbulb, RefreshCw, CheckCircle, AlertCircle, BookOpen } from "lucide-react";
import { aiApi } from "../api/ai";

function CodeHelper({ code, problemDescription, language = "javascript" }) {
  const [suggestion, setSuggestion] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("suggestions"); // suggestions | review
  const [customHint, setCustomHint] = useState("");
  const [error, setError] = useState(null);

  const handleGetSuggestion = async (hint = "") => {
    if (!code) {
      setError("Please write some code first");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.getCodeSuggestions(
        code,
        problemDescription,
        language,
        hint || customHint
      );
      setSuggestion(data.suggestion);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to get suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleGetReview = async () => {
    if (!code) {
      setError("Please write some code first");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.getCodeReview(code, language);
      setReview(data.review);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to get code review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 h-full flex flex-col">
      <div className="card-body p-4 flex flex-col h-full">
        <h2 className="card-title text-lg gap-2 mb-4">
          <Lightbulb className="size-5 text-warning" />
          AI Code Helper
        </h2>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-4 flex-shrink-0">
          <button
            className={`tab ${activeTab === "suggestions" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("suggestions")}
          >
            Suggestions
          </button>
          <button
            className={`tab ${activeTab === "review" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            Code Review
          </button>
          <button
            className={`tab ${activeTab === "translate" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("translate")}
          >
            Translate
          </button>
        </div>

        {/* Suggestions Tab */}
        {activeTab === "suggestions" && (
          <div className="space-y-3 flex-1 overflow-y-auto">
            <div className="form-control gap-2">
              <label className="label">
                <span className="label-text text-sm">Custom Hint (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Ask for help with specific part..."
                value={customHint}
                onChange={(e) => setCustomHint(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>

            <button
              onClick={() => handleGetSuggestion()}
              disabled={loading || !code}
              className="btn btn-primary btn-sm w-full gap-2"
            >
              {loading ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Lightbulb className="size-4" />
              )}
              {loading ? "Getting Suggestion..." : "Get Suggestion"}
            </button>

            {suggestion && (
              <div className="space-y-2">
                {suggestion.suggestion && (
                  <div className="alert alert-info">
                    <BookOpen className="size-4" />
                    <span className="text-sm">{suggestion.suggestion}</span>
                  </div>
                )}

                {suggestion.hint && (
                  <div className="alert alert-warning">
                    <Lightbulb className="size-4" />
                    <span className="text-sm">{suggestion.hint}</span>
                  </div>
                )}

                {suggestion.error && (
                  <div className="alert alert-error">
                    <AlertCircle className="size-4" />
                    <span className="text-sm">{suggestion.error}</span>
                  </div>
                )}

                {suggestion.improvement && (
                  <div className="alert alert-success">
                    <CheckCircle className="size-4" />
                    <span className="text-sm">{suggestion.improvement}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Review Tab */}
        {activeTab === "review" && (
          <div className="space-y-3 flex-1 overflow-y-auto">
            <button
              onClick={handleGetReview}
              disabled={loading || !code}
              className="btn btn-primary btn-sm w-full gap-2"
            >
              {loading ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {loading ? "Reviewing Code..." : "Review Code"}
            </button>

            {review && (
              <div className="space-y-2">
                {review.quality && (
                  <div className="bg-base-200 p-3 rounded text-sm">
                    <h4 className="font-semibold mb-1">Quality</h4>
                    <p>{review.quality}</p>
                  </div>
                )}

                {review.performance && (
                  <div className="bg-base-200 p-3 rounded text-sm">
                    <h4 className="font-semibold mb-1">Performance</h4>
                    <p>{review.performance}</p>
                  </div>
                )}

                {review.bestPractices && (
                  <div className="bg-base-200 p-3 rounded text-sm">
                    <h4 className="font-semibold mb-1">Best Practices</h4>
                    <p>{review.bestPractices}</p>
                  </div>
                )}

                {review.risks && (
                  <div className="bg-warning/20 p-3 rounded text-sm">
                    <h4 className="font-semibold mb-1">Potential Risks</h4>
                    <p>{review.risks}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mt-auto">
            <AlertCircle className="size-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!suggestion && !review && !error && activeTab === "suggestions" && (
          <div className="flex items-center justify-center h-32 text-base-content/50 text-sm">
            <p>Write code and click "Get Suggestion" to receive AI guidance</p>
          </div>
        )}

        {!suggestion && !review && !error && activeTab === "review" && (
          <div className="flex items-center justify-center h-32 text-base-content/50 text-sm">
            <p>Click "Review Code" to get a detailed code analysis</p>
          </div>
        {/* Translate Tab */}
        {activeTab === "translate" && (
          <div className="space-y-3 flex-1 overflow-y-auto">
            <div className="form-control gap-2">
              <label className="label">
                <span className="label-text text-sm">Target Language</span>
              </label>
              <select 
                className="select select-bordered select-sm w-full"
                id="target-language-select"
                onChange={(e) => handleTranslate(e.target.value)}
                disabled={loading || !code}
              >
                <option disabled selected>Pick a language</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
              </select>
            </div>

            {loading && (
              <div className="flex items-center justify-center p-8">
                <Loader className="size-8 animate-spin text-primary" />
              </div>
            )}

            {!loading && suggestion?.translatedCode && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                   <h4 className="text-sm font-semibold">Translated Code:</h4>
                   <button 
                     className="btn btn-xs btn-ghost text-primary"
                     onClick={() => {
                        window.dispatchEvent(new CustomEvent("arena-apply-code", { 
                          detail: { code: suggestion.translatedCode } 
                        }));
                     }}
                   >
                     Apply to Editor
                   </button>
                </div>
                <div className="relative group">
                  <pre className="bg-base-200 p-3 rounded text-xs overflow-x-auto max-h-60 border border-base-300">
                    <code>{suggestion.translatedCode}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  async function handleTranslate(targetLang) {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.translateCode(code, targetLang, problemDescription);
      setSuggestion(prev => ({ ...prev, translatedCode: data.translatedCode }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to translate code");
    } finally {
      setLoading(false);
    }
  }
}

export default CodeHelper;
