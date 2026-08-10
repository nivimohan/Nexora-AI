import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Zap,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trophy,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 3: Aptitude Lab
// Adaptive AI-powered 5-question assessment calibrated to the user's target role.
// ─────────────────────────────────────────────────────────────────────────────

// ── View states ──
const VIEW_LANDING  = "landing";
const VIEW_LOADING  = "loading";
const VIEW_TEST     = "test";
const VIEW_RESULTS  = "results";

// ── Subtle particle ring for the landing screen ──
const PulseRing = () => (
  <div className="relative w-24 h-24 flex items-center justify-center mx-auto mb-6">
    <motion.div
      className="absolute inset-0 rounded-full border-2"
      style={{ borderColor: "rgba(216, 185, 195, 0.4)" }}
      animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute inset-0 rounded-full border"
      style={{ borderColor: "rgba(216, 185, 195, 0.2)" }}
      animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
    />
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center"
      style={{ background: "rgba(216, 185, 195, 0.12)", border: "1px solid rgba(216, 185, 195, 0.35)" }}
    >
      <FlaskConical size={28} style={{ color: "#D8B9C3" }} />
    </div>
  </div>
);

export default function AptitudeTrainerPage({
  setActiveView,
  milestoneContext = null,
  workspacePackage,
  setWorkspacePackage,
  aptitudeSession,
  setAptitudeSession,
}) {
  const [view, setView]             = useState(() => aptitudeSession?.view || VIEW_LANDING);
  const [questions, setQuestions]   = useState(() => aptitudeSession?.questions || []);
  const [targetJob, setTargetJob]   = useState(() => aptitudeSession?.targetJob || "your target role");
  const [currentIdx, setCurrentIdx] = useState(() => aptitudeSession?.currentIdx || 0);
  const [answers, setAnswers]       = useState(() => aptitudeSession?.answers || {});
  const [results, setResults]       = useState(() => aptitudeSession?.results || null);
  const [expanded, setExpanded]     = useState(() => aptitudeSession?.expanded || {});
  const [isCompleted, setIsCompleted] = useState(() => aptitudeSession?.isCompleted || false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError]           = useState("");

  const user     = JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const roleLabel = user?.targetRole || "your target role";

  // ── Sync ALL state up to parent session object on every change ──────────────
  // This persists state across tab switches, preventing blank screen crashes.
  useEffect(() => {
    if (setAptitudeSession) {
      setAptitudeSession({
        view,
        questions,
        targetJob,
        currentIdx,
        answers,
        results,
        expanded,
        isCompleted,
      });
    }
  }, [view, questions, targetJob, currentIdx, answers, results, expanded, isCompleted, setAptitudeSession]);

  // ── Guard: if completed, always render results directly on re-entry ─────────
  // (Prevents blank screen on tab switch back after finishing)
  if (isCompleted && results && view !== VIEW_RESULTS) {
    setView(VIEW_RESULTS);
  }

  // ── 1. Generate test (cache-aware) ───────────────────────────────────────
  const handleStartTest = useCallback(async (force = false) => {
    setView(VIEW_LOADING);
    setError("");
    try {
      let data = force ? null : workspacePackage;
      if (!data) {
        const demoMode = JSON.parse(
  localStorage.getItem("nexora_demo_mode") || "false"
);

const res = await api.post("/generate-workspace-package", {
  milestoneContext,
  forceRefresh: force,
  demoMode,
});
        if (res.data?.success) {
          data = res.data.data;
          setWorkspacePackage(data);
        } else {
          throw new Error("Failed to generate study package.");
        }
      }

      if (data && data.aptitudeQuestions) {
        setQuestions(data.aptitudeQuestions);
        setTargetJob(data.target_job || roleLabel);
        setCurrentIdx(0);
        setAnswers({});
        setExpanded({});
        setResults(null);
        setView(VIEW_TEST);
      } else {
        throw new Error("Aptitude questions not found in study package.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Something went wrong.");
      setView(VIEW_LANDING);
    }
  }, [workspacePackage, setWorkspacePackage, milestoneContext, roleLabel]);

  // ── 2. Select option ─────────────────────────────────────────────────────
  const handleSelect = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  // ── 3. Navigate questions ─────────────────────────────────────────────────
  const handleNext = () => {
    if (currentIdx < questions.length - 1) setCurrentIdx((i) => i + 1);
  };
  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  // ── 4. Submit and score ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitLoading(true);
    setError("");

    const breakdown = questions.map((q) => {
      const selected = answers[q.id] || null;
      const isCorrect = selected === q.correctAnswer;
      return { ...q, selected, isCorrect };
    });

    const score      = breakdown.filter((q) => q.isCorrect).length;
    const weakTopics = breakdown.filter((q) => !q.isCorrect).map((q) => q.question);

    try {
      // Fire both telemetry hooks in parallel (non-blocking on failure)
      await Promise.allSettled([
        // 1. Analytics history + per-module best-score tracking
        api.post("/submit-assessment", {
          module:           "aptitude-lab",
          score,
          total:            questions.length,
          weakTopics,
          milestoneContext,
        }),
        // 2. Training session — XP award, sets daily_challenge_done
        api.post("/submit-training-session", {
          correctAnswers:   score,
          total:            questions.length,
          module:           "aptitude-lab",
          weakTopics,
          milestoneContext,
        }),
      ]);
    } catch (err) {
      console.warn("Score telemetry failed (non-blocking):", err.message);
    } finally {
      setSubmitLoading(false);
    }

    // Lock the completed state — tab switches will restore this exact screen
    setResults({ score, total: questions.length, breakdown });
    setIsCompleted(true);
    setView(VIEW_RESULTS);
  };


  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — LANDING
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_LANDING) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full"
        >
          <PulseRing />

          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                       font-display font-semibold uppercase tracking-widest border mb-4"
            style={{
              background: "rgba(216,185,195,0.08)",
              borderColor: "rgba(216,185,195,0.25)",
              color: "#D8B9C3",
            }}
          >
            <Zap size={9} />
            Feature 3 — Aptitude Lab
          </span>

          <h1 className="text-3xl font-display font-black text-white tracking-tight mt-2 mb-3">
            Calibrating Assessment Vectors
          </h1>
          <p className="text-sm text-white/75 leading-relaxed mb-3">
            for{" "}
            <span className="text-white font-semibold">{roleLabel}</span>
          </p>
          <p className="text-xs text-white/55 leading-relaxed mb-8 max-w-sm mx-auto">
            NEXORA AI will generate 5 focused aptitude questions covering quantitative reasoning,
            logical deduction, and domain-relevant analytical problems — customized to your career target.
          </p>

          {error && (
            <p className="text-xs text-red-400 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <motion.button
            onClick={() => handleStartTest(true)}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl
                       text-plum text-sm font-display font-bold transition-all duration-200"
            style={{ backgroundColor: "#D8B9C3" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            [ Start Dynamic Assessment ➔ ]
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — LOADING (Gemini generating questions)
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_LOADING) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(216, 185, 195, 0.1)", border: "1px solid rgba(216, 185, 195, 0.25)" }}
          >
            <Loader2 size={26} style={{ color: "#D8B9C3" }} className="animate-spin" />
          </div>
          <h3 className="text-lg font-display font-bold text-white">
            Synthesizing Questions…
          </h3>
          <p className="text-xs text-white/55 max-w-xs">
            NEXORA AI is building your personalized aptitude assessment. This takes a few seconds.
          </p>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — ACTIVE TEST
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_TEST && currentQ) {
    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto min-h-full">
        {JSON.parse(localStorage.getItem("nexora_demo_mode") || "false") && (
  <div className="flex justify-end mb-4">
    <div
      className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        background: "rgba(34,197,94,.15)",
        color: "#86EFAC",
        border: "1px solid rgba(34,197,94,.35)",
      }}
    >
      🟢 Demo Mode
    </div>
  </div>
)}
        {/* Header */}
        <motion.div
          className="mb-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] font-display font-semibold uppercase tracking-widest px-2.5 py-1
                         rounded-full border"
              style={{
                background: "rgba(216,185,195,0.08)",
                borderColor: "rgba(216,185,195,0.25)",
                color: "#D8B9C3",
              }}
            >
              Aptitude Lab — {targetJob}
            </span>
            <span className="text-xs text-white/50 font-sans">
              Question {currentIdx + 1} of {questions.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #D8B9C3, #c9a0b0)" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            className="rounded-2xl p-6 mb-5"
            style={{
              background: "rgba(77, 76, 125, 0.28)",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              backdropFilter: "blur(12px)",
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.28 }}
          >
            <p className="text-base font-sans font-medium text-white leading-relaxed mb-6">
              {currentQ.question}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((option, i) => {
                const isSelected = answers[currentQ.id] === option;
                const letterLabel = ["A", "B", "C", "D"][i];

                return (
                  <motion.button
                    key={i}
                    onClick={() => handleSelect(currentQ.id, option)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left
                               transition-all duration-150"
                    style={{
                      background: isSelected
                        ? "rgba(216, 185, 195, 0.18)"
                        : "rgba(255, 255, 255, 0.04)",
                      border: isSelected
                        ? "1px solid rgba(216, 185, 195, 0.55)"
                        : "1px solid rgba(255, 255, 255, 0.07)",
                    }}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                                 text-[10px] font-display font-bold"
                      style={{
                        background: isSelected ? "#D8B9C3" : "rgba(255,255,255,0.08)",
                        color: isSelected ? "#363062" : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {letterLabel}
                    </span>
                    <span className={`text-sm font-sans ${isSelected ? "text-white" : "text-white/75"}`}>
                      {option}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation row */}
        <div className="flex items-center justify-between gap-3">
          <motion.button
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-semibold
                       text-white/60 transition-all duration-150 disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            whileHover={{ scale: currentIdx === 0 ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            ← Previous
          </motion.button>

          <span className="text-[11px] text-white/40 font-sans">
            {answeredCount} / {questions.length} answered
          </span>

          {currentIdx < questions.length - 1 ? (
            <motion.button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-display font-semibold
                         text-white transition-all duration-150"
              style={{ background: "rgba(216,185,195,0.15)", border: "1px solid rgba(216,185,195,0.3)" }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Next <ChevronRight size={13} />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSubmit}
              disabled={!allAnswered || submitLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-display font-bold
                         text-plum transition-all duration-150 disabled:opacity-40"
              style={{ backgroundColor: "#D8B9C3" }}
              whileHover={{ scale: allAnswered && !submitLoading ? 1.04 : 1 }}
              whileTap={{ scale: 0.97 }}
            >
              {submitLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>[ Submit Assessment ➔ ]</>
              )}
            </motion.button>
          )}
        </div>

        {!allAnswered && currentIdx === questions.length - 1 && (
          <p className="text-center text-[11px] text-white/40 mt-3 font-sans">
            Answer all questions before submitting.
          </p>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — RESULTS & EXPLANATIONS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_RESULTS && results) {
    const { score, total, breakdown } = results;
    const percentage = Math.round((score / total) * 100);

    const scoreTier =
      score === total    ? { label: "Perfect Score!", color: "#6ee7b7" } :
      score >= total * 0.8 ? { label: "Excellent",   color: "#a5f3fc" } :
      score >= total * 0.6 ? { label: "Good Effort",  color: "#D8B9C3" } :
                              { label: "Keep Practicing", color: "#fca5a5" };

    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto min-h-full">
        {JSON.parse(localStorage.getItem("nexora_demo_mode") || "false") && (
  <div className="flex justify-end mb-4">
    <div
      className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        background: "rgba(34,197,94,.15)",
        color: "#86EFAC",
        border: "1px solid rgba(34,197,94,.35)",
      }}
    >
      🟢 Demo Mode
    </div>
  </div>
)}

        {/* Score banner */}
        <motion.div
          className="rounded-2xl p-6 mb-7 text-center relative overflow-hidden"
          style={{
            background: "rgba(77, 76, 125, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Radial glow */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(216,185,195,0.12) 0%, transparent 65%)" }}
          />

          <Trophy size={30} className="mx-auto mb-3" style={{ color: scoreTier.color }} />
          <h2 className="text-4xl font-display font-black text-white mb-1">
            {score} / {total}
          </h2>
          <p className="text-sm font-display font-semibold" style={{ color: scoreTier.color }}>
            {scoreTier.label} — {percentage}% Correct
          </p>
          <p className="text-xs text-white/50 mt-1 font-sans">
            Your score and XP have been saved to your profile.
          </p>
        </motion.div>

        {/* Question breakdown */}
        <h3 className="text-sm font-display font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen size={14} style={{ color: "#D8B9C3" }} />
          Review & Explanations
        </h3>

        <div className="space-y-3 mb-8">
          {breakdown.map((q, idx) => {
            const isOpen = !!expanded[q.id];
            return (
              <motion.div
                key={q.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(77, 76, 125, 0.22)",
                  border: q.isCorrect
                    ? "1px solid rgba(110, 231, 183, 0.3)"
                    : "1px solid rgba(252, 165, 165, 0.3)",
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.07 }}
              >
                {/* Question header row */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                  }
                >
                  <span className="flex-shrink-0">
                    {q.isCorrect ? (
                      <CheckCircle2 size={17} className="text-emerald-400" />
                    ) : (
                      <XCircle size={17} className="text-red-400" />
                    )}
                  </span>
                  <span className="flex-1 text-xs font-sans text-white/85 leading-snug line-clamp-2">
                    Q{idx + 1}. {q.question}
                  </span>
                  <span className="flex-shrink-0 text-white/30">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {/* Expanded explanation */}
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
                        className="px-4 pb-4 pt-0 border-t"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 mb-3">
                          <div
                            className="rounded-lg px-3 py-2 text-xs"
                            style={{ background: "rgba(252, 165, 165, 0.08)", border: "1px solid rgba(252,165,165,0.2)" }}
                          >
                            <p className="text-white/40 text-[10px] font-display uppercase tracking-wider mb-0.5">
                              Your Answer
                            </p>
                            <p className={`font-sans font-medium ${q.isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                              {q.selected || <em className="text-white/30">Skipped</em>}
                            </p>
                          </div>
                          {!q.isCorrect && (
                            <div
                              className="rounded-lg px-3 py-2 text-xs"
                              style={{ background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.2)" }}
                            >
                              <p className="text-white/40 text-[10px] font-display uppercase tracking-wider mb-0.5">
                                Correct Answer
                              </p>
                              <p className="text-emerald-300 font-sans font-medium">{q.correctAnswer}</p>
                            </div>
                          )}
                        </div>
                        <div
                          className="rounded-lg px-4 py-3"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          <p className="text-[10px] font-display uppercase tracking-wider text-white/40 mb-1.5">
                            Explanation
                          </p>
                          <p className="text-xs text-white/75 font-sans leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
          <motion.button
            onClick={() => setActiveView({ id: "dsa-arena", context: milestoneContext })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-display font-black
                       tracking-wide transition-all duration-150"
            style={{ backgroundColor: "#D8B9C3", color: "#3e2a31" }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            [ Continue to DSA Arena ➔ ]
          </motion.button>

          <motion.button
            onClick={() => {
              setIsCompleted(false);
              handleStartTest(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-display font-bold
                       text-white transition-all duration-150"
            style={{
              background: "rgba(77, 76, 125, 0.35)",
              border: "1px solid rgba(216, 185, 195, 0.25)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RotateCcw size={13} /> [ Regenerate New Assessment ]
          </motion.button>
        </div>
      </div>
    );
  }

  return null;
}
