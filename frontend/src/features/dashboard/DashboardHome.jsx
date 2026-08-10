import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Zap, Flame, Star, Rocket,
  ChevronRight, Map, FlaskConical, Code2, Mic2,
  TrendingUp, BookOpen, FileSearch, Sparkles,
  BarChart2, Activity,
} from "lucide-react";
import { getLevelProgress } from "../../lib/gamification";



// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Command Centre (DashboardHome)
//
// Real-time operations cockpit.  No hardcoded values — every metric is
// computed from user.feature_data or safe defaults.
//
// Layout:
//   ① Operational Header  — greeting + role chip
//   ② Core Telemetry Strip — Level · XP · Streak · Daily tasks
//   ③ Next-Actions Row     — Active Focus card  ║  Daily Snapshot card
//   ④ Quick-Launch rail    — all unlocked modules
// ─────────────────────────────────────────────────────────────────────────────

// ── XP → Level helper ─────────────────────────────────────────────────────────
const XP_PER_LEVEL = 500;
const xpToLevel    = (xp) => Math.max(1, Math.floor((xp || 0) / XP_PER_LEVEL) + 1);

// ── Framer variants ───────────────────────────────────────────────────────────
const wrap = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const row = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: "easeOut" } },
};

// ── Motivation quotes pool ────────────────────────────────────────────────────
const QUOTES = [
  {
    text: "Success isn't about being perfect; it's about being consistent.",
    author: "The Placement Mindset",
  },
  {
    text: "Code is like humor. When you have to explain it, it's bad.",
    author: "Cory House",
  },
  {
    text: "Your placement journey is a marathon, not a sprint. Step by step.",
    author: "Nexora Wisdom",
  },
  {
    text: "An investment in knowledge always pays the best interest.",
    author: "Benjamin Franklin",
  },
  {
    text: "The only way to do great work is to love what you do. Keep building.",
    author: "Steve Jobs",
  },
  {
    text: "Every expert was once a beginner. Ship the code. Learn from it.",
    author: "Engineering Folklore",
  },
  {
    text: "Your résumé is a story. Make sure every line earns its place.",
    author: "Nexora AI",
  },
];

// ── Build a synthetic 7-day XP series from assessment_history ────────────────
// Returns an array of 7 objects: { dayLabel, xp } from Mon → the current day.
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function buildVelocityData(history) {
  // Map ISO date strings → total XP earned that day
  const byDay = {};
  (history || []).forEach((entry) => {
    if (!entry.date) return;
    const d = new Date(entry.date);
    const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    // Controllers persist XP under 'xpEarned'; support legacy 'xpAwarded'/'xp' too
    byDay[key] = (byDay[key] || 0) + (entry.xpEarned ?? entry.xpAwarded ?? entry.xp ?? 0);
  });

  // Build the last 7 calendar days ending today
  const today  = new Date();
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      dayLabel: DAYS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1], // 0=Sun mapped to idx 6
      xp:       byDay[key] || 0,
      isToday:  i === 0,
    });
  }
  return result;
}

// ── All navigable practice modules ───────────────────────────────────────────
const ALL_MODULES = [
  { id: "resume-analyzer",  label: "Resume Analyzer",   icon: FileSearch,  color: "#D8B9C3" },
  { id: "roadmap",          label: "TutorTree",          icon: Map,         color: "#a5f3fc" },
  { id: "aptitude-lab",     label: "Aptitude Lab",       icon: FlaskConical,color: "#a5f3fc" },
  { id: "dsa-arena",        label: "DSA Arena",           icon: Code2,       color: "#6ee7b7" },
  { id: "core-concepts",    label: "Core Concepts",       icon: BookOpen,    color: "#D8B9C3" },
  { id: "mock-interviews",  label: "Mock Interviews",     icon: Mic2,        color: "#fbbf24" },
  { id: "daily-challenge",  label: "Daily Challenge",     icon: Flame,       color: "#f97316" },
  { id: "analytics-hub",    label: "My Progress Hub",    icon: TrendingUp,  color: "#D8B9C3" },
];

// ── Daily-challenge task labels ───────────────────────────────────────────────
const DAILY_TASKS = [
  { key: "aptitude", label: "Aptitude MCQ",       icon: FlaskConical, color: "#a5f3fc" },
  { key: "coding",   label: "Coding Challenge",   icon: Code2,        color: "#6ee7b7" },
  { key: "hr",       label: "HR Behavioral",       icon: Mic2,         color: "#D8B9C3" },
  { key: "verbal",   label: "Verbal Exercise",     icon: BookOpen,     color: "#fbbf24" },
];

// ── Determine which roadmap milestone is currently "In Progress" ──────────────
function getActiveMilestone(fd) {
  const milestones = fd?.roadmap?.milestones;
  if (!Array.isArray(milestones)) return null;
  return milestones.find((m) => m.status === "In Progress") || null;
}

// ── Map milestone targetModule to a practice view id ─────────────────────────
function milestoneToViewId(milestone) {
  if (!milestone) return "aptitude-lab";
  const tm = (milestone.targetModule || "").toLowerCase();
  if (tm.includes("dsa") || tm.includes("arena"))      return "dsa-arena";
  if (tm.includes("aptitude"))                          return "aptitude-lab";
  if (tm.includes("interview") || tm.includes("mock")) return "mock-interviews";
  if (tm.includes("core") || tm.includes("concept"))   return "core-concepts";
  return "aptitude-lab";
}

// ── Animated progress pill bar ────────────────────────────────────────────────
function MiniBar({ value, color, delay = 0 }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="rounded-full overflow-hidden" style={{ height: 3, background: "rgba(255,255,255,0.08)", flex: 1 }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: "easeOut", delay }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function DashboardHome({ setActiveView, user: propUser }) {
  // ── Safe data extraction with graceful defaults ──────────────────────────
  const user  = propUser || JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const fd    = user?.feature_data || {};
  const scores = fd.scores || {};
  const history = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];

  const name       = user?.name       ?? "Astronaut";
  const targetRole = user?.targetRole ?? "Your Target Role";
  const totalXP  = Math.max(0, user?.totalXP ?? 0);
  const lvlInfo  = useMemo(() => getLevelProgress(totalXP), [totalXP]);
  const level    = lvlInfo.level;
  const xpPct    = lvlInfo.pct;
  const streak   = fd.daily_streak_counter ?? 0;

  // Today's daily challenge task completion counter
  const challengeDone = fd.challenge_completed === true;
  const dailyTasksDone = challengeDone ? 4 : 0; // 4 = all tasks cleared

  // ── Stable random quote — locked on mount, never re-rolls on re-render ──────
  const quoteIdxRef = useRef(Math.floor(Math.random() * QUOTES.length));
  const quote       = QUOTES[quoteIdxRef.current];

  // ── 7-day XP velocity bars ───────────────────────────────────────────────
  const velocityData = useMemo(() => buildVelocityData(history), [history]);

  // ── Aggregate readiness (used by header + telemetry) ─────────────────────
  const resumeScore   = fd.analysisCompleted ? (scores["resume_analyzer"]?.bestPercentage ?? 100) : 0;
  const aptitudeScore = (() => {
    const ents = history.filter((e) => e.module === "aptitude-lab" || e.module === "aptitude_lab");
    return ents.length > 0
      ? Math.round(ents.reduce((s, e) => s + (e.percentage ?? 0), 0) / ents.length)
      : (scores["aptitude_lab"]?.bestPercentage ?? 0);
  })();
  const dsaScore  = Math.max(scores["dsa_arena"]?.bestPercentage ?? 0, scores["daily_challenge"]?.bestPercentage ?? 0);
  const commScore = fd.active_interview?.confidenceScore ?? 0;
  const readiness = Math.min(100, Math.round(resumeScore * 0.25 + aptitudeScore * 0.30 + dsaScore * 0.25 + commScore * 0.20));



  // greeting prefix by time of day
  const hour   = new Date().getHours();
  const salute = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";


  return (
    <motion.div
      variants={wrap}
      initial="hidden"
      animate="visible"
      className="p-7 lg:p-10 max-w-5xl"
    >

      {/* ════════════════════════════════════════════════════════════════════
          ① OPERATIONAL HEADER
      ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={row} className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight leading-tight">
            {salute},{" "}
            <span style={{ color: "#D8B9C3" }}>{name}</span> 👋
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 mt-2">
          {/* Pulse dot */}
          <span className="w-2 h-2 rounded-full bg-rose animate-pulse flex-shrink-0" />
          <span className="text-sm text-white/60 font-sans">Calibrated for</span>
          {/* Role chip */}
          <span
            className="px-3 py-1 rounded-full text-xs font-display font-bold"
            style={{
              background: "rgba(216,185,195,0.12)",
              border: "1px solid rgba(216,185,195,0.4)",
              color: "#D8B9C3",
            }}
          >
            {targetRole}
          </span>
          {/* Readiness score chip */}
          {readiness > 0 && (
            <span
              className="px-3 py-1 rounded-full text-xs font-display font-bold flex items-center gap-1"
              style={{
                background: "rgba(110,231,183,0.1)",
                border: "1px solid rgba(110,231,183,0.35)",
                color: "#6ee7b7",
              }}
            >
              <Activity size={10} />
              {readiness}% Ready
            </span>
          )}
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════
          ② CORE TELEMETRY STRIP — 4 live metric cards
      ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={row} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {/* Level */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
          style={{ background: "rgba(77,76,125,0.28)", border: "1px solid rgba(216,185,195,0.15)" }}
        >
          <div className="absolute top-0 right-0 w-14 h-14 pointer-events-none"
            style={{ background: "radial-gradient(circle at top right, rgba(216,185,195,0.18) 0%, transparent 70%)" }} />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(216,185,195,0.12)", border: "1px solid rgba(216,185,195,0.35)" }}>
            <Star size={15} style={{ color: "#D8B9C3" }} />
          </div>
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-sans">Level</p>
            <p className="text-2xl font-display font-black text-white mt-0.5">Lv.{level}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <MiniBar value={xpPct} color="#D8B9C3" delay={0.2} />
              <span className="text-[9px] text-white/25 font-sans flex-shrink-0">{xpPct}%</span>
            </div>
          </div>
        </div>

        {/* Total XP */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
          style={{ background: "rgba(77,76,125,0.28)", border: "1px solid rgba(251,191,36,0.15)" }}
        >
          <div className="absolute top-0 right-0 w-14 h-14 pointer-events-none"
            style={{ background: "radial-gradient(circle at top right, rgba(251,191,36,0.18) 0%, transparent 70%)" }} />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.35)" }}>
            <Zap size={15} style={{ color: "#fbbf24" }} />
          </div>
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-sans">Total XP</p>
            <p className="text-2xl font-display font-black text-white mt-0.5">{totalXP.toLocaleString()}</p>
          </div>
          <p className="text-[10px] text-white/25 font-sans">{lvlInfo.xpToNext} XP to Lv.{level + 1}</p>
        </div>

        {/* Active Streak */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
          style={{ background: "rgba(77,76,125,0.28)", border: "1px solid rgba(249,115,22,0.15)" }}
        >
          <div className="absolute top-0 right-0 w-14 h-14 pointer-events-none"
            style={{ background: "radial-gradient(circle at top right, rgba(249,115,22,0.18) 0%, transparent 70%)" }} />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.35)" }}>
            <Flame size={15} style={{ color: "#f97316" }} />
          </div>
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-sans">Streak</p>
            <p className="text-2xl font-display font-black text-white mt-0.5">{streak}d</p>
          </div>
          <p className="text-[10px] font-display font-semibold"
            style={{ color: streak >= 7 ? "#f97316" : streak > 0 ? "#fbbf24" : "rgba(255,255,255,0.25)" }}>
            {streak >= 7 ? "🔥 On fire!" : streak > 0 ? "Keep going!" : "Start today →"}
          </p>
        </div>

        {/* Today's checklist */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
          style={{ background: "rgba(77,76,125,0.28)", border: "1px solid rgba(110,231,183,0.15)" }}
        >
          <div className="absolute top-0 right-0 w-14 h-14 pointer-events-none"
            style={{ background: "radial-gradient(circle at top right, rgba(110,231,183,0.15) 0%, transparent 70%)" }} />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.35)" }}>
            <Rocket size={15} style={{ color: "#6ee7b7" }} />
          </div>
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-sans">Today's Tasks</p>
            <p className="text-2xl font-display font-black text-white mt-0.5">{dailyTasksDone} / 4</p>
          </div>
          <p className="text-[10px] font-display font-semibold"
            style={{ color: challengeDone ? "#6ee7b7" : "rgba(255,255,255,0.30)" }}>
            {challengeDone ? "✓ Challenge claimed!" : "Daily challenge open"}
          </p>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════
          ③ INSIGHT ROW — Daily Motivation  +  7-Day XP Velocity
      ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={row} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">

        {/* ── LEFT: Daily Cosmic Motivation ──────────────────────────────── */}
        <div
          className="rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: "rgba(77,76,125,0.30)",
            border: "1px solid rgba(216,185,195,0.22)",
            minHeight: 196,
          }}
        >
          {/* Ambient sweep */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 0% 100%, rgba(216,185,195,0.10) 0%, transparent 65%)" }} />

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(216,185,195,0.14)", border: "1px solid rgba(216,185,195,0.40)" }}
            >
              <Sparkles size={12} style={{ color: "#D8B9C3" }} />
            </div>
            <p className="text-[10px] font-display font-bold uppercase tracking-widest text-white/40">
              ✨ Today's Calibration Focus
            </p>
          </div>

          {/* Quote body */}
          <blockquote className="flex-1 flex flex-col justify-center">
            <p
              className="text-base font-display font-semibold leading-relaxed italic"
              style={{ color: "#D8B9C3" }}
            >
              &ldquo;{quote.text}&rdquo;
            </p>
            <footer className="mt-3 text-[11px] font-sans text-white/35">
              — {quote.author}
            </footer>
          </blockquote>

          {/* Decorative rule */}
          <div
            className="mt-4 h-px w-full rounded-full"
            style={{ background: "linear-gradient(to right, rgba(216,185,195,0.35), transparent)" }}
          />
        </div>

        {/* ── RIGHT: 7-Day XP Velocity ────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
          style={{
            background: "rgba(77,76,125,0.25)",
            border: "1px solid rgba(251,191,36,0.18)",
            minHeight: 196,
          }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.07) 0%, transparent 60%)" }} />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.40)" }}
              >
                <BarChart2 size={12} style={{ color: "#fbbf24" }} />
              </div>
              <p className="text-[10px] font-display font-bold uppercase tracking-widest text-white/40">
                📈 7-Day XP Velocity
              </p>
            </div>
            <span className="text-[10px] font-display font-bold text-white/30">
              {velocityData.reduce((s, d) => s + d.xp, 0)} XP this week
            </span>
          </div>

          {/* Bar chart */}
          <div className="flex-1 flex items-end gap-2">
            {velocityData.map(({ dayLabel, xp, isToday }, i) => {
              const maxXP = Math.max(...velocityData.map((d) => d.xp), 1);
              const pct   = xp > 0 ? Math.max(12, (xp / maxXP) * 100) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  {/* XP label above bar */}
                  {xp > 0 && (
                    <span
                      className="text-[9px] font-display font-bold"
                      style={{ color: isToday ? "#fbbf24" : "rgba(255,255,255,0.35)" }}
                    >
                      {xp}
                    </span>
                  )}
                  {/* Bar */}
                  <div
                    className="w-full rounded-t-md relative overflow-hidden"
                    style={{ height: 72, background: "rgba(255,255,255,0.05)" }}
                  >
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 rounded-t-md"
                      style={{
                        background: isToday
                          ? "linear-gradient(to top, #fbbf24, #fde68a)"
                          : "rgba(216,185,195,0.45)",
                        boxShadow: isToday ? "0 0 10px rgba(251,191,36,0.45)" : "none",
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: xp > 0 ? `${pct}%` : "3px" }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.06 }}
                    />
                  </div>
                  {/* Day label */}
                  <span
                    className="text-[10px] font-display font-bold"
                    style={{ color: isToday ? "#fbbf24" : "rgba(255,255,255,0.30)" }}
                  >
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════
          ④ QUICK-LAUNCH RAIL — all 8 modules
      ════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={row}>
        <p className="text-[9px] font-display font-bold uppercase tracking-widest text-white/30 mb-3">
          Quick Launch
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {ALL_MODULES.map(({ id, label, icon: Icon, color }, i) => (
            <motion.button
              key={id}
              onClick={() => setActiveView?.(id)}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left
                         transition-all duration-200 group"
              style={{
                background: "rgba(77,76,125,0.2)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              whileHover={{ x: 2, borderColor: `${color}55`, background: `${color}0a` }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}35` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-xs font-display font-semibold text-white/65 group-hover:text-white/95 transition-colors truncate">
                {label}
              </span>
              <ChevronRight size={12} className="text-white/15 group-hover:text-white/40 ml-auto flex-shrink-0 transition-colors" />
            </motion.button>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}
