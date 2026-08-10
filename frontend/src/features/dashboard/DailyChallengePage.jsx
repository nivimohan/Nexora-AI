import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Zap,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Code2,
  Users,
  MessageSquare,
  RotateCcw,
  Trophy,
  Star,
  AlertTriangle,
  Lock,
  Info,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 6: Daily Placement Challenge
//
// Delivers exactly 4 role-calibrated tasks refreshing every 24 hours:
//   Task 1 — Aptitude MCQ
//   Task 2 — Coding Challenge
//   Task 3 — HR Behavioral Scenario
//   Task 4 — Verbal/Communication Exercise
//
// DEMO MODE: loads static Data Scientist bundle from backend
// LIVE MODE: Gemini 2.5 Flash generates fresh role-specific tasks
// ─────────────────────────────────────────────────────────────────────────────

const VIEW_PREP      = "prep";
const VIEW_LOADING   = "loading";
const VIEW_CHALLENGE = "challenge";
const VIEW_COMPLETE  = "complete";

// ── Task type metadata ────────────────────────────────────────────────────────
const TYPE_META = {
  aptitude: { icon: FlaskConical, color: "#a5f3fc", glow: "rgba(165,243,252,0.28)", label: "Aptitude MCQ"     },
  coding:   { icon: Code2,        color: "#6ee7b7", glow: "rgba(110,231,183,0.28)", label: "Coding Challenge" },
  hr:       { icon: Users,        color: "#D8B9C3", glow: "rgba(216,185,195,0.28)", label: "HR Behavioral"    },
  verbal:   { icon: MessageSquare,color: "#fbbf24", glow: "rgba(251,191,36,0.28)",  label: "Communication"    },
};

// ── Aptitude MCQ Task card ────────────────────────────────────────────────────
// resetKey forces a full internal state reset whenever the parent regenerates.
function AptitudeTask({ task, completed, onComplete, expanded, onToggle, resetKey }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const meta = TYPE_META.aptitude;

  // Reset internal state on regeneration
  useEffect(() => {
    setSelected(null);
    setRevealed(false);
  }, [resetKey]);

  const handleSubmit = () => {
    setRevealed(true);
    if (selected === task.correctAnswer) onComplete();
  };

  return (
    <TaskShell
      index={1} meta={meta} title={task.title} completed={completed}
      expanded={expanded} onToggle={onToggle}
    >
      <p className="text-sm text-white/85 font-sans leading-relaxed mb-5">{task.question}</p>

      <div className="space-y-2.5 mb-5">
        {task.options.map((opt) => {
          const isSelected = selected === opt;
          const isCorrect  = opt === task.correctAnswer;
          let bg     = "rgba(255,255,255,0.04)";
          let border = "rgba(255,255,255,0.08)";
          if (revealed) {
            if (isCorrect)                     { bg = "rgba(110,231,183,0.1)";  border = "rgba(110,231,183,0.4)"; }
            else if (isSelected && !isCorrect) { bg = "rgba(252,165,165,0.1)";  border = "rgba(252,165,165,0.4)"; }
          } else if (isSelected) {
            bg = "rgba(165,243,252,0.1)"; border = "rgba(165,243,252,0.4)";
          }
          return (
            <button
              key={opt}
              disabled={revealed || completed}
              onClick={() => setSelected(opt)}
              className="w-full text-left px-4 py-3 rounded-xl text-xs font-sans text-white/85
                         transition-all duration-150"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              {opt}
              {revealed && isCorrect && <CheckCircle2 size={13} className="inline ml-2 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      {revealed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl px-4 py-3 mb-4 text-xs font-sans text-white/70 leading-relaxed"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[10px] font-display uppercase tracking-widest text-white/35 mb-1.5">Explanation</p>
          {task.explanation}
        </motion.div>
      )}

      {!revealed && !completed && (
        <button
          disabled={!selected}
          onClick={handleSubmit}
          className="px-5 py-2.5 rounded-xl text-xs font-display font-black transition-all disabled:opacity-40"
          style={{ backgroundColor: meta.color, color: "#0f1117" }}
        >
          Submit Answer →
        </button>
      )}
    </TaskShell>
  );
}

// ── Coding Task card ──────────────────────────────────────────────────────────
function CodingTask({ task, completed, onComplete, expanded, onToggle, resetKey }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const meta = TYPE_META.coding;

  useEffect(() => { setShowAnswer(false); }, [resetKey]);

  return (
    <TaskShell
      index={2} meta={meta} title={task.title} completed={completed}
      expanded={expanded} onToggle={onToggle}
    >
      <p className="text-sm text-white/85 font-sans leading-relaxed mb-4">{task.question}</p>

      <div
        className="rounded-xl px-4 py-3 mb-4 text-xs font-sans text-white/60"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-[10px] font-display uppercase tracking-widest text-white/35 mb-1.5">Approach Hint</p>
        {task.solutionHint}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowAnswer((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-semibold
                     text-white/60 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {showAnswer ? <><ChevronUp size={12} /> Hide Answer</> : <><ChevronDown size={12} /> View Reference Answer</>}
        </button>
        {!completed && (
          <button
            onClick={onComplete}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-black transition-all"
            style={{ backgroundColor: meta.color, color: "#0f1117" }}
          >
            <CheckCircle2 size={12} /> Mark as Done →
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAnswer && (
          <motion.pre
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed"
            style={{ background: "rgba(110,231,183,0.06)", border: "1px solid rgba(110,231,183,0.18)" }}
          >
            {task.referenceAnswer}
          </motion.pre>
        )}
      </AnimatePresence>
    </TaskShell>
  );
}

// ── HR Task card ──────────────────────────────────────────────────────────────
function HRTask({ task, completed, onComplete, expanded, onToggle, resetKey }) {
  const [showSample, setShowSample] = useState(false);
  const meta = TYPE_META.hr;

  useEffect(() => { setShowSample(false); }, [resetKey]);

  return (
    <TaskShell
      index={3} meta={meta} title={task.title} completed={completed}
      expanded={expanded} onToggle={onToggle}
    >
      <div
        className="rounded-xl px-4 py-4 mb-5"
        style={{ background: "rgba(216,185,195,0.07)", border: "1px solid rgba(216,185,195,0.2)" }}
      >
        <p className="text-sm text-white font-sans leading-relaxed">{task.question}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowSample((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-semibold
                     text-white/60 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {showSample ? <><ChevronUp size={12} /> Hide Sample</> : <><ChevronDown size={12} /> View Sample Answer</>}
        </button>
        {!completed && (
          <button
            onClick={onComplete}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-black transition-all"
            style={{ backgroundColor: meta.color, color: "#3e2a31" }}
          >
            <CheckCircle2 size={12} /> Mark as Done →
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSample && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 rounded-xl text-xs font-sans text-white/75 leading-relaxed"
            style={{ background: "rgba(216,185,195,0.06)", border: "1px solid rgba(216,185,195,0.15)" }}
          >
            <p className="text-[10px] font-display uppercase tracking-widest text-white/30 mb-2">Sample Strong Answer</p>
            {task.sampleAnswer}
          </motion.div>
        )}
      </AnimatePresence>
    </TaskShell>
  );
}

// ── Verbal Task card ──────────────────────────────────────────────────────────
function VerbalTask({ task, completed, onComplete, expanded, onToggle }) {
  const meta = TYPE_META.verbal;

  return (
    <TaskShell
      index={4} meta={meta} title={task.title} completed={completed}
      expanded={expanded} onToggle={onToggle}
    >
      <div
        className="rounded-xl px-4 py-4 mb-5"
        style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
      >
        <p className="text-sm text-white font-sans leading-relaxed">{task.prompt}</p>
      </div>

      <div className="space-y-2 mb-5">
        {Array.isArray(task.tips) && task.tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-white/60 font-sans">
            <Star size={11} className="mt-0.5 flex-shrink-0 text-amber-400" />
            {tip}
          </div>
        ))}
      </div>

      {!completed && (
        <button
          onClick={onComplete}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-black transition-all"
          style={{ backgroundColor: meta.color, color: "#0f1117" }}
        >
          <CheckCircle2 size={12} /> Mark as Done →
        </button>
      )}
    </TaskShell>
  );
}

// ── Shared task shell wrapper ──────────────────────────────────────────────────
function TaskShell({ index, meta, title, completed, expanded, onToggle, children }) {
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: completed ? "rgba(110,231,183,0.06)" : "rgba(77, 76, 125, 0.22)",
        border:     completed ? "1px solid rgba(110,231,183,0.3)" : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Header row — always visible */}
      <button className="w-full flex items-center gap-3 p-5 text-left" onClick={onToggle}>
        {completed
          ? <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
          : <Circle      size={20} className="text-white/25 flex-shrink-0" />
        }
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: meta.glow.replace("0.28", "0.12"), border: `1px solid ${meta.glow.replace("0.28", "0.4")}` }}
        >
          <Icon size={15} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-white/35 mb-0.5">
            Task {index} — {meta.label}
          </p>
          <p className="text-sm font-display font-bold text-white truncate">{title}</p>
        </div>
        <div className="flex-shrink-0 text-white/30">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="pt-4">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function DailyChallengePage({ setActiveView, setUser }) {
  const [view, setView]           = useState(VIEW_PREP);
  const [bundle, setBundle]       = useState(null);
  const [targetJob, setTargetJob] = useState("your target role");
  const [error, setError]         = useState("");

  // Per-task completion flags
  const [done, setDone] = useState({ aptitude: false, coding: false, hr: false, verbal: false });
  // Per-task expansion
  const [expanded, setExpanded] = useState({ aptitude: false, coding: false, hr: false, verbal: false });

  // resetKey: incremented on each regeneration so sub-component useEffect triggers
  const [resetKey, setResetKey] = useState(0);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [xpResult,   setXpResult]   = useState(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  // Practice mode: true when today's XP was already awarded AND user regenerated
  // a new set (so they can practice without earning duplicate XP)
  const [practiceMode, setPracticeMode] = useState(false);

  // Guard: track whether submission has already fired for the CURRENT set
  const submittedRef = useRef(false);

  const allDone = done.aptitude && done.coding && done.hr && done.verbal;

  const markDone     = (key) => setDone((prev) => ({ ...prev, [key]: true }));
  const toggleExpand = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Generate daily challenge bundle on demand ─────────────────────────────
  const handleGenerate = useCallback(async (force = false) => {
    setView(VIEW_LOADING);
    setError("");
    try {
      const demoMode = JSON.parse(localStorage.getItem("nexora_demo_mode") || "false");
      const res = await api.post("/daily-challenge/generate", { demoMode, forceRefresh: force });
      if (res.data?.success) {
        const data = res.data.data;
        setBundle(data);
        setTargetJob(data.target_job || "your target role");

        const claimed = data.challengeCompleted || false;
        setAlreadyClaimed(claimed);

        // If today's XP is already claimed and this is a forced regeneration (not initial load),
        // activate Practice Mode — user can complete tasks without earning duplicate XP
        if (claimed && force) {
          setPracticeMode(true);
        } else {
          setPracticeMode(false);
        }

        // Full reset of task state for the new set
        setDone({ aptitude: false, coding: false, hr: false, verbal: false });
        setExpanded({ aptitude: true, coding: false, hr: false, verbal: false });
        setXpResult(null);
        submittedRef.current = false; // allow submission on this fresh set
        setResetKey((k) => k + 1);  // force sub-component internal state reset
        setView(VIEW_CHALLENGE);
      } else {
        throw new Error("Failed to load daily challenge.");
      }
    } catch (err) {
      console.error("[DailyChallenge] generate error:", err);
      setError(err.response?.data?.message || err.message || "Something went wrong.");
      setView(VIEW_PREP);
    }
  }, []);

  // ── Submit telemetry when all 4 tasks are done ────────────────────────────
  const handleSubmitAll = useCallback(async () => {
    if (submittedRef.current) return; // belt-and-suspenders: prevent double-fire
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await api.post("/daily-challenge/submit");
      if (res.data?.success) {
        if (res.data.alreadyClaimed) {
          setAlreadyClaimed(true);
          setPracticeMode(true);
          setView(VIEW_COMPLETE);
        } else {
          const resultData = res.data.data;
          setXpResult(resultData);

          // ── REAL-TIME GLOBAL XP SYNC ──────────────────────────────────────────
          // Push the full updated user to both localStorage AND React context so
          // DashboardHome (Command Centre), sidebar pills, and CareerAnalyticsHub
          // (My Progress Hub) reflect totalXP/streak immediately without a reload.
          if (resultData?.user) {
            try {
              localStorage.setItem("nexora_user", JSON.stringify(resultData.user));
            } catch (_) { /* storage quota — non-fatal */ }
            if (typeof setUser === "function") {
              setUser(resultData.user); // ← propagates to all sibling views via DashboardPage
            }
          }
          setAlreadyClaimed(true); // mark so re-generate enters practice mode
          setView(VIEW_COMPLETE);
        }
      } else {
        throw new Error("Failed to submit challenge.");
      }
    } catch (err) {
      console.error("[DailyChallenge] submit error:", err);
      setError(err.response?.data?.message || err.message || "Submission failed.");
      submittedRef.current = false; // allow retry on network error
    } finally {
      setSubmitting(false);
    }
  }, [setUser]);

  // ── Auto-expand next incomplete task when one is marked done ─────────────
  useEffect(() => {
    if (done.aptitude && !done.coding)  setExpanded((p) => ({ ...p, aptitude: false, coding:  true }));
    if (done.coding   && !done.hr)      setExpanded((p) => ({ ...p, coding: false,   hr:      true }));
    if (done.hr       && !done.verbal)  setExpanded((p) => ({ ...p, hr: false,       verbal:  true }));
  }, [done.aptitude, done.coding, done.hr, done.verbal]);

  // ── Auto-trigger submission when all 4 complete and XP not yet claimed ────
  // Fires once per set (submittedRef prevents double-fire on re-renders)
  useEffect(() => {
    if (
      allDone &&
      !alreadyClaimed &&
      !practiceMode &&
      !submitting &&
      !submittedRef.current &&
      view === VIEW_CHALLENGE
    ) {
      handleSubmitAll();
    }
  }, [allDone, alreadyClaimed, practiceMode, submitting, view, handleSubmitAll]);

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — PREP SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_PREP) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[560px] text-center max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid rgba(251,191,36,0.35)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)" }}
            >
              <Flame size={28} style={{ color: "#fbbf24" }} />
            </div>
          </div>

          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                       font-display font-semibold uppercase tracking-widest border mb-4"
            style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)", color: "#fbbf24" }}
          >
            <Zap size={9} /> Feature 6 — Daily Challenge
          </span>

          <h1 className="text-2xl font-display font-black text-white tracking-tight mt-2 mb-2">
            Daily Placement Challenge
          </h1>
          <p className="text-sm text-white/65 leading-relaxed mb-2">
            4 role-calibrated tasks, refreshed every <strong className="text-white">24 hours</strong>.
          </p>
          <p className="text-xs text-white/40 leading-relaxed mb-8 max-w-sm mx-auto">
            Complete all 4 tasks (Aptitude, Coding, HR, Verbal) to claim your{" "}
            <strong className="text-amber-400">+10 XP streak bonus</strong> and advance your daily streak counter.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Object.entries(TYPE_META).map(([key, m]) => {
              const Icon = m.icon;
              return (
                <div
                  key={key}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-display font-semibold"
                  style={{ background: m.glow.replace("0.28", "0.1"), border: `1px solid ${m.glow.replace("0.28", "0.3")}`, color: m.color }}
                >
                  <Icon size={11} /> {m.label}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="text-xs text-red-400 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2 text-left">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <motion.button
            onClick={() => handleGenerate(false)}
            className="w-full max-w-xs inline-flex items-center justify-center gap-2 px-6 py-3.5
                       rounded-xl text-sm font-display font-black tracking-wide transition-all"
            style={{ backgroundColor: "#fbbf24", color: "#0f1117" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Flame size={15} /> Load Today's Challenge →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — LOADING
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_LOADING) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 size={32} className="animate-spin mb-4" style={{ color: "#fbbf24" }} />
        <p className="text-sm font-display text-white/70">Building your daily challenge board...</p>
        <p className="text-xs text-white/35 mt-2 font-sans">Nexora is calibrating 4 tasks to your role</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — CHALLENGE BOARD
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_CHALLENGE && bundle) {
    const completedCount = Object.values(done).filter(Boolean).length;

    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 mb-7"
        >
          <div>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                         font-display font-semibold uppercase tracking-widest border mb-3"
              style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)", color: "#fbbf24" }}
            >
              <Flame size={9} /> Daily Challenge Board
            </span>
            <h1 className="text-xl font-display font-black text-white tracking-tight">
              Today's Challenge · {targetJob}
            </h1>
            {bundle.fromDemo && (
              <span className="inline-flex items-center gap-1 text-[10px] font-display text-emerald-400 mt-1">
                🟢 Demo Mode
              </span>
            )}
          </div>

          {/* Progress tracker */}
          <div className="flex-shrink-0 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center border-2"
              style={{
                borderColor: allDone ? "#6ee7b7" : "rgba(251,191,36,0.4)",
                background:  allDone ? "rgba(110,231,183,0.12)" : "rgba(251,191,36,0.08)",
              }}
            >
              <span className="text-sm font-display font-black" style={{ color: allDone ? "#6ee7b7" : "#fbbf24" }}>
                {completedCount}/4
              </span>
            </div>
            <p className="text-[10px] font-display text-white/35 mt-1">Done</p>
          </div>
        </motion.div>

        {/* ── Practice Mode banner (day's XP already claimed) ─────────────────── */}
        {practiceMode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-4 mb-6 flex items-start gap-3"
            style={{ background: "rgba(165,243,252,0.07)", border: "1px solid rgba(165,243,252,0.2)" }}
          >
            <Info size={15} className="text-cyan-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-display font-bold text-cyan-200">Practice Mode Active</p>
              <p className="text-[11px] text-white/50 font-sans mt-0.5">
                Additional sets allow practice without duplicating daily streak bonuses. Your XP for today has already been awarded. Come back tomorrow for a fresh challenge!
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Already claimed banner (first load, not a regeneration) ─────────── */}
        {alreadyClaimed && !practiceMode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.25)" }}
          >
            <Lock size={16} className="text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-display font-bold text-emerald-300">Challenge Already Claimed Today</p>
              <p className="text-[11px] text-white/50 font-sans">You've already collected your +10 XP today. Come back tomorrow for a fresh streak!</p>
            </div>
          </motion.div>
        )}

        {/* Task cards */}
        <div className="space-y-4 mb-7">
          <AptitudeTask
            task={bundle.aptitudeTask}
            completed={done.aptitude}
            onComplete={() => markDone("aptitude")}
            expanded={expanded.aptitude}
            onToggle={() => toggleExpand("aptitude")}
            resetKey={resetKey}
          />
          <CodingTask
            task={bundle.codingTask}
            completed={done.coding}
            onComplete={() => markDone("coding")}
            expanded={expanded.coding}
            onToggle={() => toggleExpand("coding")}
            resetKey={resetKey}
          />
          <HRTask
            task={bundle.hrTask}
            completed={done.hr}
            onComplete={() => markDone("hr")}
            expanded={expanded.hr}
            onToggle={() => toggleExpand("hr")}
            resetKey={resetKey}
          />
          <VerbalTask
            task={bundle.verbalTask}
            completed={done.verbal}
            onComplete={() => markDone("verbal")}
            expanded={expanded.verbal}
            onToggle={() => toggleExpand("verbal")}
            resetKey={resetKey}
          />
        </div>

        {/* ── Submitting spinner (auto-triggered after 4/4) ────────────────────── */}
        <AnimatePresence>
          {submitting && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-5 text-center flex flex-col items-center gap-3 mb-6"
              style={{ background: "rgba(77,76,125,0.22)", border: "1px solid rgba(251,191,36,0.2)" }}
            >
              <Loader2 size={22} className="animate-spin text-amber-300" />
              <p className="text-xs font-display text-white/60">Submitting your challenge results…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── XP success banner (shown inline after auto-submit completes) ────── */}
        <AnimatePresence>
          {xpResult && !submitting && view === VIEW_CHALLENGE && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-5 mb-6 flex items-center gap-4"
              style={{ background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.3)" }}
            >
              <CheckCircle2 size={22} className="text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-display font-bold text-white">🎉 Daily Challenge Completed!</p>
                <p className="text-xs text-white/55 font-sans mt-0.5">
                  +{xpResult.xpEarned} XP awarded · Streak: 🔥 {xpResult.dailyStreak} day{xpResult.dailyStreak !== 1 ? "s" : ""} · Total: {xpResult.totalXP} XP
                </p>
              </div>
              <motion.button
                onClick={() => setView(VIEW_COMPLETE)}
                className="px-4 py-2.5 rounded-xl text-xs font-display font-black flex-shrink-0"
                style={{ backgroundColor: "#6ee7b7", color: "#0f1117" }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              >
                View Results →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Practice Mode complete — all 4 done but no XP ───────────────────── */}
        <AnimatePresence>
          {allDone && practiceMode && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(165,243,252,0.06)", border: "1px solid rgba(165,243,252,0.2)" }}
            >
              <CheckCircle2 size={24} className="text-cyan-300 mx-auto mb-2" />
              <p className="text-sm font-display font-bold text-white mb-1">Practice Complete! Great work.</p>
              <p className="text-xs text-white/45 font-sans">
                Practice Mode Active — Additional sets allow practice without duplicating daily streak bonuses.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        {error && (
          <div className="text-xs text-red-400 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={13} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Refresh / Regenerate button */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => handleGenerate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-semibold
                       text-white/40 hover:text-white/70 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <RotateCcw size={12} /> Regenerate New Challenge
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — COMPLETION CELEBRATION
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_COMPLETE) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45 }}
          className="w-full flex flex-col items-center"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{
              background:  "rgba(251,191,36,0.15)",
              border:      "2px solid rgba(251,191,36,0.45)",
              boxShadow:   "0 0 28px rgba(251,191,36,0.25)",
            }}
          >
            <Trophy size={32} style={{ color: "#fbbf24" }} />
          </div>

          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px]
                       font-display font-bold uppercase tracking-wider border mb-3"
            style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.3)", color: "#fbbf24" }}
          >
            {practiceMode ? "Practice Complete!" : "Challenge Complete!"}
          </span>

          <h2 className="text-2xl font-display font-black text-white leading-tight mb-2">
            {practiceMode ? "Great Practice Session! 💡" : "Streak Maintained! 🔥"}
          </h2>

          {practiceMode ? (
            <p className="text-sm text-white/60 mb-6 font-sans">
              Practice Mode Active — Additional sets allow practice without duplicating daily streak bonuses.
            </p>
          ) : xpResult ? (
            <>
              <p className="text-sm text-white/60 mb-5 font-sans">
                Your daily streak continues. Keep it up!
              </p>
              <div
                className="rounded-2xl px-8 py-5 mb-8 flex items-center gap-4 border"
                style={{ background: "rgba(77,76,125,0.3)", borderColor: "rgba(251,191,36,0.2)" }}
              >
                <Zap size={20} className="text-amber-300 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs text-white/50 font-sans">XP Earned</p>
                  <p className="text-2xl font-display font-black text-amber-300">+{xpResult.xpEarned} XP</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-left">
                  <p className="text-xs text-white/50 font-sans">Streak</p>
                  <p className="text-2xl font-display font-black text-white">🔥 {xpResult.dailyStreak}</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-left">
                  <p className="text-xs text-white/50 font-sans">Total XP</p>
                  <p className="text-2xl font-display font-black text-white">{xpResult.totalXP}</p>
                </div>
              </div>
            </>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm justify-center">
            <motion.button
              onClick={() => setActiveView("analytics-hub")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl
                         text-xs font-display font-black tracking-wide transition-all"
              style={{ backgroundColor: "#D8B9C3", color: "#3e2a31" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              View My Progress Hub →
            </motion.button>
            <motion.button
              onClick={() => setActiveView("home")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl
                         text-white text-xs font-display font-black tracking-wide transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            >
              Back to Command Centre
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
