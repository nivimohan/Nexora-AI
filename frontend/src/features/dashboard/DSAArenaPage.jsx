import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Zap,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  TerminalSquare,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — DSA Arena (Feature 5)
// Reads the dsaArenaProblems section of the workspace package.
// On mount, checks for an active_package cache in the user's localStorage
// profile — if found, renders instantly without prompting to reload.
// ─────────────────────────────────────────────────────────────────────────────

const VIEW_LOADING  = "loading";
const VIEW_PROBLEMS = "problems";
const VIEW_ERROR    = "error";

export default function DSAArenaPage({
  setActiveView,
  milestoneContext = null,
  workspacePackage,
  setWorkspacePackage,
  dsaState,
  setDsaState,
}) {
  const [view, setView]           = useState(() => dsaState?.view || (workspacePackage?.dsaArenaProblems ? VIEW_PROBLEMS : VIEW_LOADING));
  const [problems, setProblems]   = useState(() => dsaState?.problems || workspacePackage?.dsaArenaProblems || []);
  const [targetJob, setTargetJob] = useState(() => dsaState?.targetJob || workspacePackage?.targetRole || "");
  const [expanded, setExpanded]   = useState(() => dsaState?.expanded || {});
  const [error,    setError]      = useState("");
  const [claiming, setClaiming]   = useState(false);
  const [claimed,  setClaimed]    = useState(false);
  const [completed, setCompleted] = useState({});

  const user       = JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const targetRole = user?.targetRole || "Software Engineer";

  // Sync state changes back to parent context for state retention
  useEffect(() => {
    if (setDsaState) {
      setDsaState({ view, problems, targetJob, expanded });
    }
  }, [view, problems, targetJob, expanded, setDsaState]);

  // ── Load package (cache-first) ────────────────────────────────────────────
  const loadPackage = useCallback(async (force = false) => {
    setView(VIEW_LOADING);
    setError("");
    try {
      let data = force ? null : workspacePackage;
      if (!data) {
        const res = await api.post("/generate-workspace-package", {
          milestoneContext,
          forceRefresh: force,
        });
        if (res.data?.success) {
          data = res.data.data;
          setWorkspacePackage(data);
        } else {
          throw new Error("Failed to load study package.");
        }
      }

      if (data && data.dsaArenaProblems) {
        setProblems(data.dsaArenaProblems || []);
        setTargetJob(data.target_job || targetRole);
        setExpanded({});
        setView(VIEW_PROBLEMS);
      } else {
        throw new Error("DSA problems not found in study package.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Something went wrong.");
      setView(VIEW_ERROR);
    }
  }, [workspacePackage, setWorkspacePackage, milestoneContext, targetRole]);

  // Auto-load on mount if problems are empty
  useEffect(() => {
    if (problems.length === 0) {
      loadPackage(false);
    }
  }, [problems.length, loadPackage]);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
const toggleCompleted = (id) => {
  setCompleted((prev) => ({
    ...prev,
    [id]: !prev[id],
  }));
};
const completedCount = Object.values(completed).filter(Boolean).length;
const allCompleted = completedCount === problems.length && problems.length > 0;
  // ── Claim XP Telemetry ──────────────────────────────────────────────────
  const handleClaimPoints = async () => {
  setClaiming(true);

  try {
    const res = await api.post("/complete-milestone");

    if (res.data?.success) {
      console.log("Claim Successful");

      setClaimed(true);

      const meRes = await api.get("/auth/me");

      if (meRes.data?.success && meRes.data?.user) {
        localStorage.setItem(
          "nexora_user",
          JSON.stringify(meRes.data.user)
        );
      }

      sessionStorage.setItem("roadmap_refresh", "1");
    }

  } catch (err) {
    console.error("XP claim failure:", err);

  } finally {
    setClaiming(false);
  }
};
  // ════════════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_LOADING) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(129, 140, 248, 0.1)", border: "1px solid rgba(129, 140, 248, 0.25)" }}
          >
            <Loader2 size={26} style={{ color: "#818cf8" }} className="animate-spin" />
          </div>
          <h3 className="text-lg font-display font-bold text-white">Loading DSA Challenges…</h3>
          <p className="text-xs text-white/55 max-w-xs">
            Fetching your personalized coding problems — this is instant if your session package is already cached.
          </p>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_ERROR) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(252, 165, 165, 0.1)", border: "1px solid rgba(252, 165, 165, 0.25)" }}
        >
          <Brain size={26} style={{ color: "#fca5a5" }} />
        </div>
        <h3 className="text-base font-display font-bold text-white mb-2">Failed to Load</h3>
        <p className="text-xs text-white/55 mb-5 max-w-xs">{error}</p>
        <motion.button
          onClick={() => loadPackage(false)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-display font-bold text-white"
          style={{ background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <RefreshCw size={12} /> Try Again
        </motion.button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PROBLEMS VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto min-h-full">
{JSON.parse(localStorage.getItem("nexora_demo_mode") || "false") && (
  <div className="flex justify-end mb-4">
    <span
      className="px-3 py-1 rounded-full text-[11px] font-semibold"
      style={{
        background: "rgba(34,197,94,0.15)",
        border: "1px solid rgba(34,197,94,.4)",
        color: "#86efac",
      }}
    >
      🟢 Demo Dataset
    </span>
  </div>
)}
      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-display font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
            style={{ background: "rgba(129,140,248,0.08)", borderColor: "rgba(129,140,248,0.25)", color: "#818cf8" }}
          >
            DSA Arena — {targetJob}
          </span>
          <motion.button
            onClick={() => loadPackage(true)}
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            whileHover={{ x: -2 }}
            title="Generate fresh problems"
          >
            <RefreshCw size={11} /> Regenerate
          </motion.button>
        </div>
        <h1 className="text-2xl font-display font-black text-white">Your Coding Challenges</h1>
        <p className="text-xs text-white/55 mt-1 font-sans">
          Read each problem carefully. Understand the input/output contracts before coding.
        </p>

        {milestoneContext && (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mt-3"
            style={{ background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)" }}
          >
            <Zap size={10} style={{ color: "#818cf8" }} />
            <span className="text-[11px] text-indigo-300 font-display font-semibold">{milestoneContext}</span>
          </div>
        )}
      </motion.div>

      {/* Problems list */}
      <div className="space-y-5 mb-8">
        {problems.map((problem, idx) => {
          const key    = problem.id ?? idx;
          const isOpen = !!expanded[key];
          return (
            <motion.div
              key={key}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(77, 76, 125, 0.25)",
                border: "1px solid rgba(129, 140, 248, 0.2)",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.1 }}
            >
              {/* Problem header */}
              <button
                className="w-full flex items-center gap-3 p-5 text-left"
                onClick={() => toggleExpand(key)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-display font-bold"
                  style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}
                >
                  #{idx + 1}
                </div>
                <div className="flex-1">
                  <p
  className={`text-sm font-display font-bold ${
    completed[key]
      ? "line-through text-white/40"
      : "text-white"
  }`}
>
  {problem.problemTitle}
</p>
                </div>
                <span className="text-white/30 flex-shrink-0">
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </button>

              {/* Expandable details */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-5 pb-5 pt-0 space-y-4 border-t"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ClipboardList size={13} style={{ color: "#818cf8" }} />
                          <span className="text-[10px] text-white/40 font-display uppercase tracking-wider">
                            Problem Statement
                          </span>
                        </div>
                        <p className="text-sm text-white/80 font-sans leading-relaxed">
                          {problem.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          className="rounded-xl p-4"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          <p className="text-[10px] text-white/40 font-display uppercase tracking-wider mb-1.5">Input Format</p>
                          <p className="text-xs text-white/75 font-sans leading-relaxed">{problem.inputFormat}</p>
                        </div>
                        <div
                          className="rounded-xl p-4"
                          style={{ background: "rgba(129,140,248,0.07)", border: "1px solid rgba(129,140,248,0.15)" }}
                        >
                          <p className="text-[10px] text-indigo-300/60 font-display uppercase tracking-wider mb-1.5">Expected Output</p>
                          <p className="text-xs text-white/75 font-sans leading-relaxed">{problem.expectedOutput}</p>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{ background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.12)" }}
                      >
                        <TerminalSquare size={12} style={{ color: "#818cf8" }} />
                        <span className="text-[11px] text-white/40 font-sans">
                          Solve this challenge in your preferred IDE, then mark it as completed once you're confident with your solution.
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
  <input
    type="checkbox"
    checked={!!completed[key]}
    onChange={() => toggleCompleted(key)}
    className="w-5 h-5 accent-indigo-500"
  />

  <span
    className={`text-sm ${
      completed[key]
        ? "text-green-400"
        : "text-white/70"
    }`}
  >
    Mark this challenge as completed
  </span>
</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Dynamic linear actions bar */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-white/5">
        <motion.button
          onClick={handleClaimPoints}
          disabled={!allCompleted || claiming || claimed}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-plum text-xs font-display font-black tracking-wider transition-all duration-200 disabled:opacity-50"
          style={{
  background: claimed
    ? "linear-gradient(135deg, #D8B9C3 0%, #C89EAC 100%)"
    : allCompleted
    ? "linear-gradient(135deg, #D8B9C3 0%, #C89EAC 100%)"
    : "rgba(255,255,255,0.08)",
  color: "#2F1E2B",
}}
          whileHover={{ scale: claimed || claiming ? 1 : 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
         {claiming ? (
  <Loader2 size={14} className="animate-spin text-white" />
) : claimed ? (
  "✓ Points Claimed"
) : allCompleted ? (
  "[ Claim Points & Complete Coding Tasks ]"
) : (
  `Complete ${problems.length - completedCount} more challenge(s)`
)}
        </motion.button>

        <motion.button
          onClick={() => {
            if (setActiveView) {
              setActiveView({ id: "core-concepts", context: milestoneContext });
            }
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-plum text-xs font-display font-black tracking-wider transition-all duration-200"
          style={{
  background: "linear-gradient(135deg, #D8B9C3 0%, #C89EAC 100%)",
  color: "#2F1E2B",
}}
          whileHover={{ scale: 1.03, background: "rgba(255,255,255,0.08)" }}
          whileTap={{ scale: 0.97 }}
        >
          [ Open Associated Core Concepts Studio ➔ ]
        </motion.button>
      </div>

      <div className="mt-6">
        <motion.button
          onClick={() => {
            if (setActiveView) setActiveView("roadmap");
          }}
          className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          whileHover={{ x: -2 }}
        >
          <ArrowLeft size={12} /> Back to TutorTree
        </motion.button>
      </div>
    </div>
  );
}
