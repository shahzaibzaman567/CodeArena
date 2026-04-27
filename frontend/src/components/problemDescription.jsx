import { getDifficultyBadgeClass } from "../lib/utils.js";

function ProblemDescription({ problem, currentProblemId, onProblemChange, allProblems }) {
  if (!problem) return null;

  // 🛡️ Senior Dev: Handle both library (object) and database (string) descriptions
  const descriptionText = typeof problem.description === 'string' 
    ? problem.description 
    : problem.description?.text || "No description provided.";
  
  const notes = problem.description?.notes || [];
  const examples = problem.examples || [];
  const constraints = problem.constraints || [];

  return (
    <div className="h-full overflow-y-auto bg-base-200">
      {/* HEADER SECTION */}
      <div className="p-6 bg-base-100 border-b border-base-300">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-3xl font-bold text-base-content tracking-tight">{problem.title}</h1>
          <span className={`badge ${getDifficultyBadgeClass(problem.difficulty)}`}>
            {problem.difficulty}
          </span>
        </div>
        <p className="text-base-content/60 text-sm font-medium">{problem.category || "General Coding"}</p>

        {/* Problem selector */}
        <div className="mt-6">
          <label className="text-[10px] uppercase font-black opacity-30 mb-2 block tracking-widest">Select Problem</label>
          <select
            className="select select-sm w-full bg-base-200 border-base-300 focus:border-primary"
            value={currentProblemId}
            onChange={(e) => onProblemChange(e.target.value)}
          >
            {allProblems.map((p) => (
              <option key={p.id || p._id} value={p.id || p._id}>
                {p.title} ({p.difficulty})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* PROBLEM DESC */}
        <div className="bg-base-100 rounded-2xl shadow-sm p-6 border border-base-300">
          <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Description</h2>

          <div className="space-y-4 text-base leading-relaxed text-base-content/80">
            <div className="whitespace-pre-wrap">{descriptionText}</div>
            {notes.length > 0 && (
              <div className="pt-4 border-t border-base-300 space-y-2">
                {notes.map((note, idx) => (
                  <p key={idx} className="text-sm italic">• {note}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EXAMPLES SECTION */}
        {examples.length > 0 && (
          <div className="bg-base-100 rounded-2xl shadow-sm p-6 border border-base-300">
            <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Examples</h2>
            <div className="space-y-6">
              {examples.map((example, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="size-5 rounded-md bg-base-300 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                    <p className="text-xs font-bold opacity-60">Example Case</p>
                  </div>
                  <div className="bg-base-200 rounded-xl p-4 font-mono text-sm space-y-2 border border-base-300">
                    <div className="flex gap-3">
                      <span className="text-primary/60 font-bold w-16">Input</span>
                      <span className="text-base-content">{example.input}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-secondary/60 font-bold w-16">Output</span>
                      <span className="text-base-content">{example.output}</span>
                    </div>
                    {example.explanation && (
                      <div className="pt-2 border-t border-base-300 mt-2 text-xs opacity-60 italic">
                        <strong>Note:</strong> {example.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONSTRAINTS */}
        {constraints.length > 0 && (
          <div className="bg-base-100 rounded-2xl shadow-sm p-6 border border-base-300">
            <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Constraints</h2>
            <ul className="space-y-3">
              {constraints.map((constraint, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-base-content/70">
                  <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <code>{constraint}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProblemDescription;