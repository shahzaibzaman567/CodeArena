import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  SparklesIcon,
  ZapIcon,
  ArrowRightIcon,
  CheckIcon,
  VideoIcon,
  Code2Icon,
  UserIcon,
} from "lucide-react";
import Hero from "../../public/hero.png";

function HomePage() {
  const { data } = useQuery({
    queryFn: () => fetch("api/books").then((res) => res.json()),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300">
      {/* NAVBAR */}
      <nav className="bg-base-100/80 backdrop-blur-md border-b border-primary/10 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg p-1">
              <SparklesIcon className="size-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-mono tracking-wider leading-none">
                Codearena
              </span>
              <span className="text-[10px] text-base-content/60 font-bold uppercase mt-0.5">
                Code Together
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="group px-5 py-2 bg-gradient-to-r from-primary to-secondary rounded-lg text-white 
                font-bold text-xs shadow-md hover:shadow-xl transition-all duration-200
                 flex items-center gap-2 cursor-pointer hover:scale-105">
                  Get Started
                  <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT CONTENT */}
          <div className="flex flex-col items-start space-y-8">
            <div className="badge badge-primary badge-md py-4 gap-2 shadow-sm border-none">
              <ZapIcon className="size-3 fill-current" />
              <span className="font-bold uppercase tracking-widest text-[10px]">Real-time Collaboration</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Code Together
              </span>
            </h1>
<h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-zinc-300">
               Learn Together
              </span>
            </h1>
            {/* Paragraph Jiski width par Pills depend karenge */}
            <p className="text-lg text-base-content/70 leading-relaxed max-w-lg">
              The ultimate platform for real-time collaborative coding. Connect
              with developers worldwide, share your code instantly, and build
              your skills together.
            </p>

            {/* FEATURE PILLS - Paragraph ki width (max-w-lg) ke barabar */}
            <div className="flex flex-wrap gap-2 max-w-lg">
              {["Live Video Chat", "Code Editor", "Multi-Languages"].map((feature) => (
                <div key={feature} className="badge badge-lg badge-outline gap-2 py-5 px-6 text-xs font-bold border-primary/20 bg-base-100/30 flex-1 min-w-fit">
                  <CheckIcon className="size-4 text-success" /> {feature}
                </div>
              ))}
            </div>

            {/* CTA & STATS - Inki width Paragraph se Choti (max-w-md) rakhi hai */}
            <div className="w-full max-w-md space-y-6">
              
              {/* Buttons with Hover Animation */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <SignInButton mode="modal">
                  <button className="group btn btn-primary btn-md sm:btn-lg flex-1 text-xs font-bold shadow-lg whitespace-nowrap px-4">
                    Start Coding Now
                    <ArrowRightIcon className="size-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignInButton>

                <button className="group btn btn-outline btn-md sm:btn-lg flex-1 text-xs font-bold whitespace-nowrap px-4">
                  <VideoIcon className="size-4 shrink-0 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </button>
              </div>

              {/* Stats Section - Matching Button Width */}
              <div className="stats stats-vertical sm:stats-horizontal bg-base-100/40 backdrop-blur-md shadow-xl border border-primary/10 w-full overflow-hidden">
                <div className="stat place-items-center py-4 px-2">
                  <div className="stat-value text-primary text-xl font-black">10K+</div>
                  <div className="stat-title text-[9px] font-black uppercase opacity-60">Active Users</div>
                </div>

                <div className="stat place-items-center py-4 px-2">
                  <div className="stat-value text-secondary text-xl font-black">50K+</div>
                  <div className="stat-title text-[9px] font-black uppercase opacity-60">Sessions</div>
                </div>

                <div className="stat place-items-center py-4 px-2 border-none">
                  <div className="stat-value text-accent text-xl font-black">99.9%</div>
                  <div className="stat-title text-[9px] font-black uppercase opacity-60">Uptime</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <img 
          src={Hero}
          alt="CodeCollab Platform "
          className="w-full h-auto rounded-3xl shadow-2xl border-4 border-base-100 
          hover:scale-105 transition-transform duration-500"
          />


        </div>
      </div>
   
{/* FEATURES GRID */}
 <div className="max-w-7xl mx-auto px-4 py-20">
  <div className="text-center mb-16 space-y-4">
    <h2 className="text-4xl md:text-4xl font-black tracking-tight text-base-content">
      Everything you need to{" "}
      <span className="text-primary font-mono">Succeed</span>
    </h2>
    <p className="text-lg text-base-content/70 max-w-2xl mx-auto leading-relaxed">
      Powerful features designed to make your coding interviews 
      <span className="text-base-content font-semibold"> seamless </span> 
      and productive.
    </p>
  </div>

  {/* FEATURES GRID - Fixed width to keep it centered and compact */}
  <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
    
    {/* FEATURE 1 */}
    <div className="card bg-base-100/50 border border-primary/10 shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
      <div className="card-body items-center text-center p-8">
        <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <VideoIcon className="size-7 text-primary" />
        </div>
        <h3 className="card-title text-lg font-bold">HD Video Call</h3>
        <p className="text-sm text-base-content/70 leading-relaxed">
          Crystal clear video and audio for seamless communication during interview.
        </p>
      </div>
    </div>

    {/* FEATURE 2 - Wrapped in Card div */}
    <div className="card bg-base-100/50 border border-primary/10 shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
      <div className="card-body items-center text-center p-8">
        <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <Code2Icon className="size-7 text-primary" />
        </div>
        <h3 className="card-title text-lg font-bold">Live Code Editor</h3>
        <p className="text-sm text-base-content/70 leading-relaxed">
          Collaborate in real-time with syntax highlighting and multiple language support.
        </p>
      </div>
    </div>

    {/* FEATURE 3 - Wrapped in Card div */}
    <div className="card bg-base-100/50 border border-primary/10 shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
      <div className="card-body items-center text-center p-8">
        <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <UserIcon className="size-7 text-primary" />
        </div>
        <h3 className="card-title text-lg font-bold">Easy Collaborations</h3>
        <p className="text-sm text-base-content/70 leading-relaxed">
          Share your screen, discuss solutions, and learn from each other in real-time.
        </p>
      </div>
    </div>

  </div>
</div>
 
  </div>

   
  );
}

export default HomePage;