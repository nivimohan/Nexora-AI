import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Zap,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Core Concepts Studio (Feature 6)
// Reads coreConceptsGuide from the workspace package.
// Auto-loads on mount using cache-first logic. When all bullets are checked,
// shows a [ Claim 100 XP & Update Roadmap ➔ ] button that fires the
// completeMilestone endpoint and redirects back to the Roadmap view.
// ─────────────────────────────────────────────────────────────────────────────

const VIEW_LOADING  = "loading";
const VIEW_GUIDE    = "guide";
const VIEW_ERROR    = "error";
const VIEW_CLAIMING = "claiming"; // XP claim in-flight

export default function CoreConceptsPage({
  setActiveView,
  milestoneContext = null,
  workspacePackage,
  setWorkspacePackage,
  conceptsState,
  setConceptsState,
}) {
  const [view,      setView]     = useState(() => conceptsState?.view || (workspacePackage?.coreConceptsGuide ? VIEW_GUIDE : VIEW_LOADING));
  const [guide,     setGuide]    = useState(() => conceptsState?.guide || workspacePackage?.coreConceptsGuide || null);
  const [targetJob, setTargetJob] = useState(() => conceptsState?.targetJob || workspacePackage?.targetRole || "");
  const [error,     setError]    = useState("");
  const [checked,   setChecked]  = useState(() => conceptsState?.checked || {});
  const [xpResult,  setXpResult] = useState(null); // { xpEarned, totalXP, allCompleted }

  const user       = JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const targetRole = user?.targetRole || "Software Engineer";

  // Sync state back to parent context for state retention
  useEffect(() => {
    if (setConceptsState) {
      setConceptsState({ view, guide, targetJob, checked });
    }
  }, [view, guide, targetJob, checked, setConceptsState]);

  // ── Load package (cache-first) ────────────────────────────────────────────
  const loadPackage = useCallback(async (force = false) => {
    setView(VIEW_LOADING);
    setError("");
    setChecked({});
    try {
      let data = force ? null : workspacePackage;
      if (!data) {
        const res = await api.post("/generate-workspace-package", {
          milestoneContext,
          forceRefresh: force,
        });
        if (res.data?.success && res.data.data.coreConceptsGuide) {
          data = res.data.data;
          setWorkspacePackage(data);
        } else {
          throw new Error("Core concepts guide not found in package.");
        }
      }

      if (data && data.coreConceptsGuide) {
        setGuide(data.coreConceptsGuide);
        setTargetJob(data.target_job || targetRole);
        setView(VIEW_GUIDE);
      } else {
        throw new Error("Core concepts guide not found in package.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Something went wrong.");
      setView(VIEW_ERROR);
    }
  }, [workspacePackage, setWorkspacePackage, milestoneContext, targetRole]);

  // Auto-load on mount if guide is empty
  useEffect(() => {
    if (!guide) {
      loadPackage(false);
    }
  }, [guide, loadPackage]);

  const toggleCheck = (idx) =>
    setChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const totalBullets  = guide?.studyBullets?.length || 0;
  const checkedCount  = Object.values(checked).filter(Boolean).length;
  const allReviewed   = totalBullets > 0 && checkedCount === totalBullets;

  // ── Claim XP & advance milestone ─────────────────────────────────────────
  const handleClaimXP = async () => {
    setView(VIEW_CLAIMING);
    try {
      const res = await api.post("/complete-milestone");
      if (res.data?.success) {
        setXpResult(res.data.data);
        // Refresh user in localStorage so DashboardPage picks up new totalXP
        const meRes = await api.get("/auth/me");
        if (meRes.data?.success && meRes.data?.user) {
          localStorage.setItem("nexora_user", JSON.stringify(meRes.data.user));
        }
        // Signal RoadmapPage to bypass cache on next mount
        sessionStorage.setItem("roadmap_refresh", "1");
        // Navigate to roadmap after a short celebration pause
        setTimeout(() => setActiveView("roadmap"), 1800);
      }
    } catch (err) {
      console.error("Milestone claim failed:", err.message);
      sessionStorage.setItem("roadmap_refresh", "1"); // still refresh on error
      setTimeout(() => setActiveView("roadmap"), 1200);
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
            style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.25)" }}
          >
            <Loader2 size={26} style={{ color: "#34d399" }} className="animate-spin" />
          </div>
          <h3 className="text-lg font-display font-bold text-white">Loading Study Guide…</h3>
          <p className="text-xs text-white/55 max-w-xs">
            Your session package is cached — this should be instant on revisits.
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
          <BookOpen size={26} style={{ color: "#fca5a5" }} />
        </div>
        <h3 className="text-base font-display font-bold text-white mb-2">Failed to Load</h3>
        <p className="text-xs text-white/55 mb-5 max-w-xs">{error}</p>
        <motion.button
          onClick={() => loadPackage(false)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-display font-bold text-white"
          style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <RefreshCw size={12} /> Try Again
        </motion.button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // XP CLAIMING CELEBRATION
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_CLAIMING) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(52, 211, 153, 0.15)", border: "2px solid rgba(52, 211, 153, 0.5)" }}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={28} style={{ color: "#34d399" }} />
          </motion.div>
          <h3 className="text-xl font-display font-black text-white">
            {xpResult ? `+${xpResult.xpEarned} XP Claimed!` : "Claiming XP…"}
          </h3>
          <p className="text-xs text-white/55">
            {xpResult?.allCompleted
              ? "🎉 All milestones complete! Redirecting to Roadmap…"
              : "Milestone advanced. Redirecting to your updated Roadmap…"}
          </p>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GUIDE VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto min-h-full">
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
      <motion.div className="mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-display font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
            style={{ background: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.25)", color: "#34d399" }}
          >
            Core Concepts — {targetJob}
          </span>
          <motion.button
            onClick={() => loadPackage(true)}
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            whileHover={{ x: -2 }}
            title="Generate fresh guide"
          >
            <RefreshCw size={11} /> Regenerate
          </motion.button>
        </div>
        <h1 className="text-2xl font-display font-black text-white">{guide?.topicTitle}</h1>
        <p className="text-xs text-white/50 mt-1 font-sans">
          Tap each concept to mark it reviewed. Claim your XP when all are done.
        </p>

        {milestoneContext && (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mt-3"
            style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)" }}
          >
            <Zap size={10} style={{ color: "#34d399" }} />
            <span className="text-[11px] text-emerald-300 font-display font-semibold">{milestoneContext}</span>
          </div>
        )}
      </motion.div>

      {/* Progress bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
        style={{ background: "rgba(52, 211, 153, 0.07)", border: "1px solid rgba(52, 211, 153, 0.18)" }}
      >
        <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #34d399, #6ee7b7)" }}
            animate={{ width: totalBullets > 0 ? `${(checkedCount / totalBullets) * 100}%` : "0%" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-[11px] text-emerald-300 font-display font-semibold flex-shrink-0">
          {checkedCount} / {totalBullets} reviewed
        </span>
      </div>

      {/* Study bullets */}
      <div className="space-y-3 mb-8">
        {(guide?.studyBullets || []).map((bullet, idx) => {
          const isChecked = !!checked[idx];
          const colonIdx  = bullet.indexOf(":");
          const keyName   = colonIdx > -1 ? bullet.slice(0, colonIdx) : null;
          const bodyText  = colonIdx > -1 ? bullet.slice(colonIdx + 1).trim() : bullet;

          return (
            <motion.button
              key={idx}
              onClick={() => toggleCheck(idx)}
              className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200"
              style={{
                background: isChecked ? "rgba(52, 211, 153, 0.1)" : "rgba(77, 76, 125, 0.2)",
                border: isChecked
                  ? "1px solid rgba(52, 211, 153, 0.35)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.07 }}
              whileHover={{ scale: 1.01 }}
            >
              <span className="flex-shrink-0 mt-0.5">
                <CheckCircle2
                  size={16}
                  style={{ color: isChecked ? "#34d399" : "rgba(255,255,255,0.2)" }}
                />
              </span>
              <span className="flex-1">
                {keyName && (
                  <span className="block text-xs font-display font-bold text-emerald-300 mb-0.5">
                    {keyName}
                  </span>
                )}
                <span className={`text-sm font-sans leading-relaxed ${isChecked ? "text-white/50 line-through" : "text-white/80"}`}>
                  {bodyText}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Completion CTA ── */}
      {allReviewed && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
            style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.3)" }}
          >
            <Lightbulb size={16} style={{ color: "#D8B9C3" }} />
            <p className="text-xs text-emerald-300 font-display font-semibold">
              All concepts reviewed! You're ready for the Mock Interview.
            </p>
          </div>
          <motion.button
    onClick={() => {
      if (setActiveView) {
        setActiveView("mock-interviews");
      }
    }}
    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl
               text-xs font-display font-black tracking-wider transition-all"
    style={{
  background: "linear-gradient(135deg,#D8B9C3 0%, #CFA7B5 100%)",
  color: "#2B2140",
  boxShadow: "0 0 24px rgba(216,185,195,.30)",
}}
    whileHover={{
      scale: 1.03,
      boxShadow: "0 0 32px rgba(52,211,153,.4)",
    }}
    whileTap={{ scale: 0.97 }}
  >
    [ Start Mock Interview ➜ ]
  </motion.button>
        </motion.div>
      )}

      {/* Back link */}
      <div className="mt-8 space-y-4">

  <motion.button
    onClick={() => setActiveView("roadmap")}
    className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
    whileHover={{ x: -2 }}
  >
    <ArrowLeft size={12} />
    Back to TutorTree
  </motion.button>

</div>
    </div>
  );
}
