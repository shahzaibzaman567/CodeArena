import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  SparklesIcon,
  VideoIcon,
  Code2Icon,
  Users,
  Zap,
  ArrowRightIcon,
  CheckIcon,
  PlayIcon,
  ChevronRightIcon,
  BrainCircuit,
  BookOpen,
  Globe,
  MessageSquare,
  Terminal,
  Layers,
} from "lucide-react";

// ── Animated typing text ────────────────────────────────────────────────────
function TypewriterCode({ lines }) {
  const [displayed, setDisplayed] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    if (pause) {
      const t = setTimeout(() => {
        setDisplayed("");
        setLineIdx((i) => (i + 1) % lines.length);
        setCharIdx(0);
        setPause(false);
      }, 1800);
      return () => clearTimeout(t);
    }
    const currentLine = lines[lineIdx];
    if (charIdx >= currentLine.length) {
      setPause(true);
      return;
    }
    const t = setTimeout(() => {
      setDisplayed((d) => d + currentLine[charIdx]);
      setCharIdx((c) => c + 1);
    }, 42);
    return () => clearTimeout(t);
  }, [charIdx, lineIdx, pause, lines]);

  return (
    <span>
      {displayed}
      <span className="animate-pulse text-primary">|</span>
    </span>
  );
}

// ── Feature step ────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 1,
    icon: <Users className="size-6 text-primary" />,
    title: "Create or Join a Session",
    desc: "Start a real-time coding session and invite your friend, teammate, or interviewer with a single link. No setup required.",
    color: "from-primary/20 to-primary/5",
    border: "border-primary/20",
    visual: (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 bg-base-200/80 rounded-xl p-4 border border-base-300">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">New Session Created</p>
            <p className="text-xs opacity-50">arena.dev/session/a1b2c3</p>
          </div>
          <span className="ml-auto badge badge-success badge-sm">Live</span>
        </div>
        <div className="flex items-center gap-3 bg-base-200/80 rounded-xl p-4 border border-base-300">
          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
            <div className="text-xs font-black text-secondary">+1</div>
          </div>
          <div>
            <p className="font-bold text-sm">Alex joined the session</p>
            <p className="text-xs opacity-50">2 participants now</p>
          </div>
          <span className="ml-auto text-xs text-success font-bold">● Online</span>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    icon: <Code2Icon className="size-6 text-secondary" />,
    title: "Code Together in Real-Time",
    desc: "Both users type in the same Monaco editor simultaneously. Changes sync instantly — like Google Docs but for code.",
    color: "from-secondary/20 to-secondary/5",
    border: "border-secondary/20",
    visual: (
      <div className="bg-base-300/60 rounded-xl border border-base-300 overflow-hidden font-mono text-sm">
        <div className="flex items-center gap-2 px-4 py-2 bg-base-200 border-b border-base-300">
          <div className="w-3 h-3 rounded-full bg-error/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
          <span className="ml-2 text-xs opacity-40">solution.js</span>
        </div>
        <div className="p-4 space-y-1 text-xs leading-relaxed">
          <p><span className="text-purple-400">function</span> <span className="text-blue-400">twoSum</span><span className="opacity-60">(nums, target) {"{"}</span></p>
          <p className="ml-4"><span className="text-purple-400">const</span> map = <span className="text-orange-400">new</span> Map();</p>
          <p className="ml-4"><span className="text-purple-400">for</span> (<span className="text-purple-400">let</span> i = <span className="text-green-400">0</span>; i &lt; nums.length; i++) {"{"}</p>
          <p className="ml-8 text-base-content"><TypewriterCode lines={["const comp = target - nums[i];", "if (map.has(comp)) return [map.get(comp), i];", "map.set(nums[i], i);"]} /></p>
          <p className="ml-4 opacity-60">{"}"}</p>
          <p className="opacity-60">{"}"}</p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    icon: <VideoIcon className="size-6 text-accent" />,
    title: "HD Video + Audio Call",
    desc: "Built-in video calling so you can see each other's expressions and communicate naturally — no third-party app needed.",
    color: "from-accent/20 to-accent/5",
    border: "border-accent/20",
    visual: (
      <div className="grid grid-cols-2 gap-3">
        {["You", "Alex"].map((name, i) => (
          <div key={name} className="relative bg-base-300 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-base-200">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${i === 0 ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"}`}>
              {name[0]}
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
              <span className="size-1.5 bg-success rounded-full animate-pulse" />
              <span className="text-white text-[10px] font-bold">{name}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 4,
    icon: <BrainCircuit className="size-6 text-warning" />,
    title: "AI Coding Assistant",
    desc: "Ask Arena AI to explain your code, find bugs, suggest improvements, or translate between languages — all inline.",
    color: "from-warning/20 to-warning/5",
    border: "border-warning/20",
    visual: (
      <div className="flex flex-col gap-3">
        <div className="chat chat-end">
          <div className="chat-bubble chat-bubble-primary text-xs max-w-[80%]">Why is my two-sum O(n²)?</div>
        </div>
        <div className="chat chat-start">
          <div className="chat-image avatar">
            <div className="w-8 rounded-full bg-secondary/20 flex items-center justify-center">
              <SparklesIcon className="size-4 text-secondary" />
            </div>
          </div>
          <div className="chat-bubble bg-base-200 text-base-content text-xs max-w-[85%] border border-base-300">
            Your nested loops check every pair. Use a <strong>HashMap</strong> to get O(n) — store each number's index, then look up the complement in O(1). ✅
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    icon: <BookOpen className="size-6 text-success" />,
    title: "Practice Problems Library",
    desc: "Hundreds of coding challenges from Easy to Hard — with test cases, difficulty badges, and solution tracking.",
    color: "from-success/20 to-success/5",
    border: "border-success/20",
    visual: (
      <div className="space-y-2">
        {[
          { title: "Two Sum", diff: "Easy", diff_c: "badge-success" },
          { title: "Maximum Subarray", diff: "Medium", diff_c: "badge-warning" },
          { title: "Merge K Lists", diff: "Hard", diff_c: "badge-error" },
        ].map((p) => (
          <div key={p.title} className="flex items-center gap-3 bg-base-200/80 rounded-xl px-4 py-3 border border-base-300 hover:border-primary/30 transition-colors">
            <Code2Icon className="size-4 text-primary shrink-0" />
            <span className="font-bold text-sm flex-1">{p.title}</span>
            <span className={`badge badge-sm ${p.diff_c}`}>{p.diff}</span>
            <ChevronRightIcon className="size-4 opacity-30" />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 6,
    icon: <Globe className="size-6 text-info" />,
    title: "Arena Community Hub",
    desc: "Real-time global chat for all CodeArena users — share solutions, ask questions, and collaborate beyond your session.",
    color: "from-info/20 to-info/5",
    border: "border-info/20",
    visual: (
      <div className="space-y-2">
        {[
          { name: "Shahzaib", msg: "Just solved Merge K sorted lists 🔥", time: "now" },
          { name: "Alex", msg: "Any hints for the sliding window problems?", time: "1m" },
          { name: "Sara", msg: "Check my solution in the thread 👆", time: "3m" },
        ].map((m) => (
          <div key={m.name} className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
              {m.name[0]}
            </div>
            <div className="flex-1 bg-base-200/80 rounded-xl px-3 py-2 border border-base-300">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black">{m.name}</span>
                <span className="text-[10px] opacity-30">{m.time}</span>
              </div>
              <p className="text-xs opacity-70 mt-0.5">{m.msg}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

// ── Main Demo Page ──────────────────────────────────────────────────────────
function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef([]);

  // Auto-advance steps
  useEffect(() => {
    const t = setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const step = STEPS[activeStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300">
      {/* NAVBAR */}
      <nav className="bg-base-100/80 backdrop-blur-md border-b border-primary/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg">
              <SparklesIcon className="size-5 text-white" />
            </div>
            <span className="font-black text-lg bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-mono">
              Codearena
            </span>
          </Link>
          <Link to="/" className="btn btn-sm btn-ghost gap-2 text-xs font-bold">
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="badge badge-primary badge-md py-4 gap-2 mb-6 shadow-sm border-none">
          <PlayIcon className="size-3 fill-current" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Platform Walkthrough</span>
        </div>

        <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight mb-6">
          See{" "}
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            CodeArena
          </span>
          <br />in Action
        </h1>

        <p className="text-lg text-base-content/60 max-w-2xl mx-auto leading-relaxed mb-10">
          A step-by-step walkthrough of every feature — from real-time collaborative coding to AI assistance, video calls, and community hub.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/dashboard" className="btn btn-primary btn-lg gap-2 shadow-xl font-bold">
            Start for Free <ArrowRightIcon className="size-4" />
          </Link>
          <div className="flex items-center gap-2 text-sm opacity-50">
            <CheckIcon className="size-4 text-success" />
            No credit card required
          </div>
        </div>
      </div>

      {/* INTERACTIVE FEATURE TOUR */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-3">How it works</h2>
          <p className="text-base-content/50 font-medium">6 powerful features, one seamless experience</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left — Step list */}
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
                  activeStep === i
                    ? `bg-gradient-to-r ${s.color} ${s.border} shadow-lg scale-[1.02]`
                    : "bg-base-100/40 border-base-300/50 hover:bg-base-200/60 hover:border-base-300"
                }`}
              >
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${activeStep === i ? "bg-base-100" : "bg-base-200"}`}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Step {s.id}</span>
                    {activeStep === i && <span className="badge badge-primary badge-xs">Viewing</span>}
                  </div>
                  <p className="font-black text-sm truncate">{s.title}</p>
                </div>
                <ChevronRightIcon className={`size-4 shrink-0 transition-transform ${activeStep === i ? "rotate-90 text-primary" : "opacity-30"}`} />
              </button>
            ))}
          </div>

          {/* Right — Live visual */}
          <div className="lg:sticky lg:top-24">
            <div className={`bg-base-100 rounded-3xl border ${step.border} shadow-2xl overflow-hidden transition-all duration-300`}>
              {/* Header */}
              <div className={`bg-gradient-to-r ${step.color} border-b ${step.border} px-6 py-5`}>
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-base-100/80 rounded-xl flex items-center justify-center">
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Step {step.id} of {STEPS.length}</p>
                    <h3 className="font-black text-lg leading-tight">{step.title}</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm opacity-70 leading-relaxed">{step.desc}</p>
              </div>

              {/* Visual */}
              <div className="p-6">{step.visual}</div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 pb-5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`rounded-full transition-all duration-300 ${i === activeStep ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-base-300 hover:bg-base-content/30"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TECH STACK STRIP */}
      <div className="border-y border-base-300 bg-base-100/40 py-10 mb-20">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-[10px] font-black uppercase tracking-widest opacity-30 mb-8">Built with industry-standard tech</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: <Code2Icon className="size-4" />, label: "Monaco Editor" },
              { icon: <VideoIcon className="size-4" />, label: "Stream Video" },
              { icon: <MessageSquare className="size-4" />, label: "Stream Chat" },
              { icon: <BrainCircuit className="size-4" />, label: "Gemini AI" },
              { icon: <Terminal className="size-4" />, label: "Piston Runtime" },
              { icon: <Layers className="size-4" />, label: "React + Vite" },
              { icon: <Zap className="size-4" />, label: "Real-time Sync" },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2 bg-base-100 border border-base-300 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm">
                <span className="text-primary">{t.icon}</span>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <div className="card bg-gradient-to-br from-primary to-secondary text-primary-content shadow-2xl overflow-hidden">
          <div className="card-body p-12 items-center">
            <div className="size-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
              <SparklesIcon className="size-8 text-white" />
            </div>
            <h2 className="card-title text-3xl font-black text-white mb-3">Ready to Code Together?</h2>
            <p className="text-white/70 text-lg mb-8 max-w-lg leading-relaxed">
              Join thousands of developers who already use CodeArena for interviews, pair programming, and learning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/dashboard" className="btn btn-white btn-lg font-black gap-2 hover:scale-105 transition-transform">
                Launch CodeArena <ArrowRightIcon className="size-5" />
              </Link>
              <Link to="/" className="btn btn-outline btn-white btn-lg font-bold text-white border-white/30 hover:bg-white/10">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DemoPage;
