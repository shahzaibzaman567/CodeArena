import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useState } from "react";
import { ChevronRightIcon, Code2Icon, PlusIcon, Trash2, Search, Loader } from "lucide-react";
import { getDifficultyBadgeClass } from "../lib/utils.js";
import { useProblems, useCreateProblem, useDeleteProblem } from "../hooks/useProblems";
import toast from "react-hot-toast";

function ProblemsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newProblem, setNewProblem] = useState({
    title: "",
    difficulty: "easy",
    description: "",
    starterCode: ""
  });
  const [isCreatingOpen, setIsCreatingOpen] = useState(false);
  
  const { data: problemsData, isLoading } = useProblems(searchQuery);
  const createProblemMutation = useCreateProblem();
  const deleteProblemMutation = useDeleteProblem();

  const problems = problemsData?.problems || [];

  const handleCreateProblem = (e) => {
    e.preventDefault();
    if (!newProblem.title.trim()) return;
    
    createProblemMutation.mutate({
      title: newProblem.title,
      difficulty: newProblem.difficulty,
      description: newProblem.description || "No description provided yet.",
      starterCode: { javascript: newProblem.starterCode || "" }
    }, {
      onSuccess: () => {
        setNewProblem({ title: "", difficulty: "easy", description: "", starterCode: "" });
        setIsCreatingOpen(false);
      }
    });
  };

  const handleDeleteProblem = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this problem?")) {
      deleteProblemMutation.mutate(id);
    }
  };

  const easyProblemsCount = problems.filter((p) => p.difficulty?.toLowerCase() === "easy").length;
  const mediumProblemsCount = problems.filter((p) => p.difficulty?.toLowerCase() === "medium").length;
  const hardProblemsCount = problems.filter((p) => p.difficulty?.toLowerCase() === "hard").length;

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* HEADER & CREATE */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Practice Problems</h1>
            <p className="text-base-content/70">
              Sharpen your coding skills or create your own challenges
            </p>
          </div>
          
          <div className="flex flex-col gap-4 w-full md:w-auto">
            {!isCreatingOpen ? (
              <button 
                onClick={() => setIsCreatingOpen(true)}
                className="btn btn-primary gap-2 shadow-lg"
              >
                <PlusIcon className="size-5" />
                Create New Problem
              </button>
            ) : (
              <div className="card bg-base-100 shadow-xl border border-primary/20 w-full md:w-[450px] animate-in fade-in zoom-in duration-200">
                <div className="card-body p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xl uppercase tracking-tighter">Create Problem</h3>
                    <button onClick={() => setIsCreatingOpen(false)} className="btn btn-xs btn-circle btn-ghost">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="form-control">
                      <label className="label py-1"><span className="label-text font-bold text-[10px] uppercase opacity-50">Problem Title</span></label>
                      <input 
                        type="text" 
                        placeholder="e.g. Sum of Two Numbers" 
                        className="input input-bordered input-md focus:input-primary"
                        value={newProblem.title}
                        onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label py-1"><span className="label-text font-bold text-[10px] uppercase opacity-50">Difficulty</span></label>
                      <select 
                        className="select select-bordered select-md"
                        value={newProblem.difficulty}
                        onChange={(e) => setNewProblem({ ...newProblem, difficulty: e.target.value })}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label py-1"><span className="label-text font-bold text-[10px] uppercase opacity-50">Description</span></label>
                      <textarea 
                        placeholder="Describe the rules and goal of this problem..." 
                        className="textarea textarea-bordered h-24 focus:textarea-primary"
                        value={newProblem.description}
                        onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label py-1"><span className="label-text font-bold text-[10px] uppercase opacity-50">Starter Code (JavaScript)</span></label>
                      <textarea 
                        placeholder="Provide starter code for JavaScript..." 
                        className="textarea textarea-bordered h-32 focus:textarea-primary font-mono text-sm"
                        value={newProblem.starterCode}
                        onChange={(e) => setNewProblem({ ...newProblem, starterCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="card-actions justify-end pt-2">
                    <button onClick={() => setIsCreatingOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
                    <button 
                      onClick={handleCreateProblem}
                      className="btn btn-primary btn-sm px-6"
                      disabled={createProblemMutation.isPending || !newProblem.title.trim()}
                    >
                      {createProblemMutation.isPending ? <Loader className="size-4 animate-spin" /> : "Save Problem"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SEARCH */}
        <div className="form-control mb-8">
          <label className="input input-bordered flex items-center gap-2">
            <Search className="size-5 opacity-50" />
            <input 
              type="text" 
              placeholder="Search problems by name..." 
              className="grow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>

        {/* PROBLEMS LIST */}
        <div className="space-y-4">
          {isLoading ? (
             <div className="flex justify-center py-20">
                <Loader className="size-12 animate-spin text-primary" />
             </div>
          ) : problems.length > 0 ? (
            problems.map((problem) => (
              <div key={problem._id} className="group relative">
                <Link
                  to={`/problem/${problem._id}`}
                  className="card bg-base-100 hover:shadow-md transition-all border border-transparent hover:border-primary/20"
                >
                  <div className="card-body p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Code2Icon className="size-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="text-xl font-bold">{problem.title}</h2>
                              <span className={`badge badge-sm ${getDifficultyBadgeClass(problem.difficulty)}`}>
                                {problem.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-base-content/70 line-clamp-1">{problem.description || "No description provided."}</p>
                      </div>

                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-1 text-primary font-medium group-hover:translate-x-1 transition-transform">
                            Solve <ChevronRightIcon className="size-4" />
                         </div>
                      </div>
                    </div>
                  </div>
                </Link>
                
                <button 
                  onClick={(e) => handleDeleteProblem(e, problem._id)}
                  className="absolute top-4 right-20 p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/10 rounded-lg"
                  title="Delete Problem"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-base-100 rounded-2xl border-2 border-dashed border-base-300">
               <Code2Icon className="size-12 mx-auto mb-4 opacity-20" />
               <h3 className="text-xl font-bold opacity-50">No problems found</h3>
               <p className="opacity-40">Create a new problem to get started!</p>
            </div>
          )}
        </div>

        {/* STATS FOOTER */}
        {!isLoading && problems.length > 0 && (
          <div className="mt-12 card bg-base-100 shadow-lg overflow-hidden border border-base-300">
            <div className="card-body p-0">
              <div className="stats stats-vertical lg:stats-horizontal rounded-none w-full">
                <div className="stat">
                  <div className="stat-title">Total Problems</div>
                  <div className="stat-value text-primary">{problems.length}</div>
                </div>

                <div className="stat">
                  <div className="stat-title">Easy</div>
                  <div className="stat-value text-success">{easyProblemsCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Medium</div>
                  <div className="stat-value text-warning">{mediumProblemsCount}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Hard</div>
                  <div className="stat-value text-error">{hardProblemsCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProblemsPage;