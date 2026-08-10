import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Map,
  Lock,
  Compass,
  ArrowRight,
  Cpu,
  Brain,
  Zap,
  Award,
  Loader2,
  FileSearch,
  BookOpen,
  Mic2,
  BarChart3,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 2: Dynamic Live Roadmap View (Powered by Gemini)
// Renders timeline milestones and job match scores populated via backend API.
// ─────────────────────────────────────────────────────────────────────────────

// Mapping target modules to matching lucide icons
const iconMap = {
  "dsa-arena": Brain,
  "core-concepts": BookOpen,
  "mock-interviews": Mic2,
  "aptitude-lab": BarChart3,
};

export default function RoadmapPage({ setActiveView }) {
  const user = JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const cachedRoadmap = user?.feature_data?.roadmap || null;

  const [loading, setLoading] = useState(!cachedRoadmap);
  const [error, setError] = useState("");
  const [roadmapData, setRoadmapData] = useState(cachedRoadmap);
  const [demoMode, setDemoMode] = useState(
    () => JSON.parse(localStorage.getItem("nexora_demo_mode") || "false")
  );

  const targetRole = user?.targetRole || "Software Engineer";
  const toggleDemoMode = () => {
    const newValue = !demoMode;
    setDemoMode(newValue);
    localStorage.setItem(
      "nexora_demo_mode",
      JSON.stringify(newValue)
    );
  };

  useEffect(() => {
    let active = true;

    // If we already have roadmapData loaded from local cache, don't show loading spinner
    api.get("/roadmap")
      .then((response) => {
        if (!active) return;
        if (response.data?.success && response.data?.data) {
          setRoadmapData(response.data.data);
          setError("");
        } else if (!cachedRoadmap) {
          setError("Failed to parse roadmap structure from the server.");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Roadmap fetch error:", err);
        if (!cachedRoadmap) {
          if (err.response?.status === 400) {
            setError("analysis_required");
          } else {
            setError(err.response?.data?.message || err.message || "Something went wrong.");
          }
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);
useEffect(() => {
  localStorage.setItem(
    "nexora_demo_mode",
    JSON.stringify(demoMode)
  );
}, [demoMode]);
  // ── Render Loading Scanner State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 lg:p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-rose/10 border border-rose/25
                        flex items-center justify-center mb-4 relative">
          <Loader2 size={24} className="text-rose animate-spin" />
        </div>
        <h3 className="font-display font-bold text-white text-base mb-1">Calibrating Roadmap Milestones…</h3>
        <p className="text-white/60 text-xs max-w-sm">
          NEXORA AI is parsing your missing skill gaps against placement domains to calculate your matching score.
        </p>
      </div>
    );
  }

  // ── Render Analysis Required Placeholder State ─────────────────────────────
  if (error === "analysis_required") {
    return (
      <div className="p-8 lg:p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-rose/10 border border-rose/25
                        flex items-center justify-center mb-4">
          <FileSearch size={22} className="text-rose" />
        </div>
        <h3 className="font-display font-bold text-white text-base mb-1">Awaiting Profile Calibration</h3>
        <p className="text-white/60 text-xs max-w-sm mb-5">
          Before generating your roadmap, you must complete your profile analysis in the Resume Analyzer.
        </p>
        <motion.button
          onClick={() => setActiveView("resume-analyzer")}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl
                     text-plum text-sm font-display font-bold transition-all duration-200"
          style={{ backgroundColor: "#D8B9C3" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          [ Go to Resume Analyzer ➔ ]
        </motion.button>
      </div>
    );
  }

  // ── Render Error State ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-8 lg:p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
        <h3 className="font-display font-bold text-white text-base mb-1">Error Loading Roadmap</h3>
        <p className="text-white/60 text-xs max-w-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-rose underline font-sans"
        >
          Retry connection
        </button>
      </div>
    );
  }

  const matchScore = roadmapData?.matchPercentage || 0;
  const milestones = roadmapData?.milestones || [];
  console.log("Milestones:", milestones);
  return (
    <div className="p-6 lg:p-10 min-h-full max-w-5xl">

      {/* ── Page Header ── */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                       font-display font-semibold uppercase tracking-widest border"
            style={{
              background: "rgba(216,185,195,0.08)",
              borderColor: "rgba(216,185,195,0.25)",
              color: "#D8B9C3",
            }}
          >
            <Map size={9} />
            Feature 2 — Adaptive Roadmap
          </span>
        </div>
        <h1 className="text-3xl font-display font-black text-white tracking-tight">
          Your Placement Trajectory
        </h1>
        <p className="mt-1.5 text-sm font-sans text-white/80">
          This system maps milestones directly to address the keyword gaps detected in your profile. Complete practice tasks to advance.
        </p>
      </motion.div>

      {/* ── Match Score Card ── */}
      <motion.div
        className="mb-10 p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row items-center gap-6"
        style={{
          background: "rgba(77, 76, 125, 0.25)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Glow */}
        <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-rose/10 blur-[60px] pointer-events-none" />

        {/* Dial ring/score */}
        <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              className="stroke-white/5 fill-none"
              strokeWidth="8"
            />
            <motion.circle
              cx="48"
              cy="48"
              r="40"
              className="stroke-rose fill-none"
              strokeWidth="8"
              strokeDasharray="251.2"
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 - (251.2 * matchScore) / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <span className="absolute text-xl font-display font-black text-white">
            {matchScore}%
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-sans font-bold">
            Dynamic Calibration Status
          </p>
          <h2 className="text-lg font-display font-black text-white mt-1">
            Your Profile is a {matchScore}% Match for a {targetRole}
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Detected skill gaps are listed below. Each study path focuses on resolving these matching gaps to maximize your likelihood of passing recruiter checks.
          </p>
        </div>
      </motion.div>

      {/* ── Timeline milestones grid ── */}
      <div className="space-y-6 relative pl-6 sm:pl-8">
        {/* Central connecting vertical line */}
        <div
          className="absolute left-3.5 sm:left-[21px] top-4 bottom-4 w-[2px]"
          style={{
            background: "linear-gradient(180deg, #D8B9C3 0%, rgba(255,255,255,0.06) 100%)",
          }}
        />

        {milestones.map((milestone, idx) => {
          const Icon = iconMap[milestone.targetModule] || Award;
          const isInProgress = milestone.status === "In Progress";

          return (
            <motion.div
              key={milestone.id || idx}
              className="relative flex flex-col md:flex-row gap-5 p-5 rounded-2xl transition-all duration-200 hover:border-white/15"
              style={{
    background: "rgba(77,76,125,.25)",
    border: "1px solid rgba(255,255,255,.08)"
}}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + idx * 0.1 }}
            >
              {/* Timeline marker node */}
              <div
                className={`absolute -left-9 sm:-left-[43px] top-6 w-7 h-7 rounded-full flex items-center justify-center border z-10
                            ${
                              <div
  className="absolute -left-9 sm:-left-[43px] top-6
             w-7 h-7 rounded-full
             flex items-center justify-center
             border
             bg-plum
             border-rose
             text-rose
             shadow-[0_0_12px_rgba(216,185,195,0.3)]"
>
  <Map size={11} />
</div>
                            }`}
              >
                <Map size={11} />

              </div>

              {/* Left text section */}
              <div className="flex-1">
                <div className="mb-2">
                  <h3 className="font-display font-bold text-white text-base">
                    {milestone.title}
                  </h3>
                </div>
                <p className="text-xs text-white/70 font-sans leading-relaxed">
                  {milestone.description}
                </p>
              </div>
            </motion.div>
          );
        })}
         {/* Start Aptitude Button */}
      <motion.div
        className="flex justify-center mt-12"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={() => setActiveView("aptitude-lab")}
          className="px-8 py-4 rounded-2xl text-plum font-display font-bold"
          style={{ backgroundColor: "#D8B9C3" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
         {
demoMode
? "[ Start Demo Journey ➜ ]"
: "[ Start Aptitude Assessment ➜ ]"
}
        </motion.button>
      </motion.div>
      </div>
      {/* Demo Mode Floating Toggle */}
<div className="fixed bottom-5 right-5 z-50">
  <div
    className="flex items-center gap-2 px-3 py-2 rounded-xl"
    style={{
      background: "rgba(54,48,98,0.95)",
      border: "1px solid rgba(216,185,195,.25)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 10px 30px rgba(0,0,0,.35)",
    }}
  >
    <span className="text-[11px] text-white/70">
      Demo
    </span>

    <button
      onClick={() => toggleDemoMode()}
      className={`w-9 h-5 rounded-full transition-all ${
        demoMode ? "bg-green-500" : "bg-white/20"
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-all ${
          demoMode ? "ml-4" : "ml-0.5"
        }`}
      />
    </button>
  </div>
</div>
    </div>
  );
}
