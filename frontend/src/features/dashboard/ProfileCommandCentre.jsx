import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Zap,
  Flame,
  Trophy,
  FileText,
  FlaskConical,
  Mic2,
  Code2,
  TrendingUp,
  Target,
  Star,
  Calendar,
  Activity,
  CheckCircle2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 8: Profile Command Centre
//
// Personal tracking cockpit. Reads live user state from MongoDB / localStorage.
// Zero AI calls. Graceful defaults for empty data / Demo Mode profiles.
//
// Data sources mapped:
//   Level          → XP ÷ 500 + 1
//   Total XP       → user.totalXP
//   Daily Streak   → feature_data.daily_streak_counter
//   Leaderboard Rank is computed locally against the same peer cohort as Feature 7
//   Resume Score   → feature_data.analysisCompleted → 100%, else 0
//   Aptitude Score → mean of assessment_history aptitude-lab entries
//   Comms Score    → feature_data.active_interview.confidenceScore
//   Code Score     → feature_data.scores.dsa_arena.bestPercentage
// ─────────────────────────────────────────────────────────────────────────────

// Mirror of Feature 7 peer cohort for rank calculation
const PEER_XP = [5620, 4890, 4120, 3450, 2760];

function xpToLevel(xp) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}
function xpForNextLevel(xp) {
  const level = xpToLevel(xp);
  return level * 500;
}
function xpProgress(xp) {
  const floor = (xpToLevel(xp) - 1) * 500;
  const ceil  = xpToLevel(xp) * 500;
  return Math.round(((xp - floor) / (ceil - floor)) * 100);
}

// ── Animated progress bar ─────────────────────────────────────────────────────
function ProgressBar({ value, color, delay = 0 }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ height: 5, background: "rgba(255,255,255,0.06)" }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.0, ease: "easeOut", delay }}
      />
    </div>
  );
}

// ── Sparkline — CSS-only thin bar chart from last N history values ─────────────
function Sparkline({ values, color }) {
  if (!values || values.length === 0) {
    // Empty state: render 6 flat placeholder bars
    return (
      <div className="flex items-end gap-1" style={{ height: 32 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: 3, background: "rgba(255,255,255,0.08)" }}
          />
        ))}
      </div>
    );
  }
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1" style={{ height: 32 }}>
      {values.slice(-8).map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-sm"
          style={{ background: color, opacity: 0.7 + (i / values.length) * 0.3 }}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(10, (v / max) * 100)}%` }}
          transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ── Top metric card (Level / XP / Streak / Rank) ─────────────────────────────
function TopMetricCard({ icon: Icon, label, value, sub, color, glow, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl p-5 relative overflow-hidden flex flex-col gap-1"
      style={{
        background: "rgba(77, 76, 125, 0.22)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${glow} 0%, transparent 70%)` }}
      />
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
        style={{ background: glow.replace("0.25", "0.12"), border: `1px solid ${glow.replace("0.25", "0.4")}` }}
      >
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-white/35">
        {label}
      </p>
      <p className="text-3xl font-display font-black text-white leading-none">{value}</p>
      {sub && <p className="text-[11px] text-white/40 font-sans mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ── Performance analytics card ────────────────────────────────────────────────
function AnalyticsCard({ icon: Icon, label, feature, value, color, glow, history, delay }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: "rgba(77, 76, 125, 0.18)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${glow} 0%, transparent 70%)` }}
      />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: glow.replace("0.28", "0.12"), border: `1px solid ${glow.replace("0.28", "0.35")}` }}
          >
            <Icon size={15} style={{ color }} />
          </div>
          <div>
            <p className="text-[9px] font-display font-semibold uppercase tracking-widest text-white/30">{feature}</p>
            <p className="text-xs font-display font-bold text-white">{label}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-display font-black leading-none" style={{ color }}>
            {pct}
          </p>
          <p className="text-[9px] text-white/30 font-sans">/ 100</p>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar value={pct} color={color} delay={delay + 0.15} />

      {/* Status label */}
      <div className="flex items-center justify-between mt-2.5 mb-3">
        <span
          className="text-[10px] font-display font-semibold"
          style={{ color: pct >= 80 ? "#6ee7b7" : pct >= 60 ? "#fbbf24" : pct >= 40 ? "#D8B9C3" : "#fca5a5" }}
        >
          {pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Fair" : pct > 0 ? "Needs Work" : "Not Started"}
        </span>
        <span className="text-[10px] text-white/25 font-sans">{pct}%</span>
      </div>

      {/* Sparkline trend */}
      <div>
        <p className="text-[9px] font-display uppercase tracking-widest text-white/20 mb-1.5">
          Historical Trend
        </p>
        <Sparkline values={history} color={color} />
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function ProfileCommandCentre({ user: propUser }) {
  // ── Defensive data extraction with graceful defaults ─────────────────────
  const rawUser = propUser || JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const fd      = rawUser?.feature_data || {};
  const scores  = fd.scores || {};
  const history = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];

  const totalXP  = rawUser?.totalXP ?? 140;
  const name     = rawUser?.name     ?? "Nivi";
  const role     = rawUser?.targetRole ?? "Data Scientist";
  const level    = xpToLevel(totalXP);
  const streak   = fd.daily_streak_counter ?? 0;
  const xpPct    = xpProgress(totalXP);
  const nextLv   = xpForNextLevel(totalXP);

  // Leaderboard rank (computed against same peer cohort as Feature 7)
  const myRank = useMemo(() => {
    const allXP = [...PEER_XP, totalXP].sort((a, b) => b - a);
    return allXP.indexOf(totalXP) + 1;
  }, [totalXP]);

  // ── Derive 4 analytics metric scores ─────────────────────────────────────

  // 1. Resume Score (Feature 1)
  const resumeScore = fd.analysisCompleted
    ? (scores["resume_analyzer"]?.bestPercentage ?? 100)
    : 0;

  // Resume history: static sparkline based on XP milestones (simulated progression)
  const resumeHistory = fd.analysisCompleted ? [40, 55, 70, 85, resumeScore] : [];

  // 2. Aptitude Score (Feature 2/3) — mean across all aptitude sessions
  const aptEntries = history.filter(
    (e) => e.module === "aptitude-lab" || e.module === "aptitude_lab"
  );
  const aptitudeScore =
    aptEntries.length > 0
      ? Math.round(
          aptEntries.reduce((s, e) => s + (e.percentage ?? 0), 0) / aptEntries.length
        )
      : scores["aptitude_lab"]?.bestPercentage ?? 0;
  // Sparkline: last 8 aptitude session percentages (oldest → newest)
  const aptHistory = aptEntries
    .slice(-8)
    .reverse()
    .map((e) => e.percentage ?? 0);

  // 3. Communication Score (Feature 4)
  const commScore = fd.active_interview?.confidenceScore ?? 0;
  // Simulate progression sparkline from interview history
  const interviewEntries = history.filter((e) => e.module === "mock-interviews");
  const commHistory = interviewEntries.length > 0
    ? interviewEntries.slice(-6).reverse().map((e) => e.percentage ?? commScore)
    : commScore > 0 ? [30, 45, commScore] : [];

  // 4. Technical / Coding Score (Feature 3 DSA Arena + Feature 6 Daily Challenge)
  const dsaBest      = scores["dsa_arena"]?.bestPercentage ?? 0;
  const dailyBest    = scores["daily_challenge"]?.bestPercentage ?? 0;
  const codeScore    = Math.max(dsaBest, dailyBest);
  const codeEntries  = history.filter(
    (e) => e.module === "dsa-arena" || e.module === "dsa_arena" || e.module === "daily-challenge"
  );
  const codeHistory = codeEntries
    .slice(-8)
    .reverse()
    .map((e) => e.percentage ?? 0);

  // ── Challenge completion stats ────────────────────────────────────────────
  const challengesDone = history.filter((e) => e.module === "daily-challenge").length;
  const totalSessions  = history.length;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">

      {/* ── Profile hero strip ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-6 mb-7 flex items-center gap-6 relative overflow-hidden"
        style={{
          background: "rgba(77, 76, 125, 0.25)",
          border: "1px solid rgba(216, 185, 195, 0.2)",
        }}
      >
        {/* ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(216,185,195,0.07) 0%, transparent 55%)" }}
        />

        {/* Feature badge */}
        <div className="absolute top-4 right-5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                       font-display font-semibold uppercase tracking-widest border"
            style={{
              background: "rgba(216,185,195,0.08)",
              borderColor: "rgba(216,185,195,0.25)",
              color: "#D8B9C3",
            }}
          >
            <BrainCircuit size={9} /> Feature 8 — Profile
          </span>
        </div>

        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-display font-black"
          style={{
            background: "rgba(216,185,195,0.15)",
            border: "2px solid rgba(216,185,195,0.45)",
            color: "#D8B9C3",
            boxShadow: "0 0 20px rgba(216,185,195,0.15)",
          }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-white/35 mb-0.5">
            Profile Command Centre
          </p>
          <h1 className="text-xl font-display font-black text-white tracking-tight truncate">
            {name}
          </h1>
          <p className="text-sm text-white/50 font-sans">{role}</p>
        </div>

        {/* XP level progress */}
        <div className="flex-shrink-0 hidden sm:block w-44">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="font-display text-white/40">Level {level}</span>
            <span className="font-display font-bold text-white/60">Level {level + 1}</span>
          </div>
          <ProgressBar value={xpPct} color="#D8B9C3" delay={0.3} />
          <p className="text-[10px] text-white/30 font-sans mt-1.5 text-right">
            {totalXP} / {nextLv} XP
          </p>
        </div>
      </motion.div>

      {/* ── 4 Core Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <TopMetricCard
          icon={Star}
          label="Current Level"
          value={`Lv.${level}`}
          sub={`${xpPct}% to Level ${level + 1}`}
          color="#D8B9C3"
          glow="rgba(216,185,195,0.25)"
          delay={0.08}
        />
        <TopMetricCard
          icon={Zap}
          label="Total XP Earned"
          value={totalXP.toLocaleString()}
          sub="Lifetime XP"
          color="#fbbf24"
          glow="rgba(251,191,36,0.25)"
          delay={0.14}
        />
        <TopMetricCard
          icon={Flame}
          label="Daily Streak"
          value={`${streak}d`}
          sub={streak >= 7 ? "🔥 On fire!" : streak > 0 ? "Keep it up!" : "Start today!"}
          color="#f97316"
          glow="rgba(249,115,22,0.25)"
          delay={0.20}
        />
        <TopMetricCard
          icon={Trophy}
          label="Leaderboard Rank"
          value={`#${myRank}`}
          sub={`of ${PEER_XP.length + 1} students`}
          color="#6ee7b7"
          glow="rgba(110,231,183,0.25)"
          delay={0.26}
        />
      </div>

      {/* ── Performance Analytics Grid ────────────────────────────────────── */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-display font-bold text-white/40 uppercase tracking-widest">
            Historical Performance Analytics
          </h2>
          <span className="text-[10px] text-white/25 font-sans">
            {totalSessions} sessions logged
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnalyticsCard
            icon={FileText}
            label="Resume Score"
            feature="Feature 1 · Profile Analysis"
            value={resumeScore}
            color="#D8B9C3"
            glow="rgba(216,185,195,0.28)"
            history={resumeHistory}
            delay={0.10}
          />
          <AnalyticsCard
            icon={FlaskConical}
            label="Aptitude Score"
            feature="Feature 3 · Aptitude Lab"
            value={aptitudeScore}
            color="#a5f3fc"
            glow="rgba(165,243,252,0.28)"
            history={aptHistory}
            delay={0.16}
          />
          <AnalyticsCard
            icon={Mic2}
            label="Communication Score"
            feature="Feature 4 · Mock Interview"
            value={commScore}
            color="#fbbf24"
            glow="rgba(251,191,36,0.28)"
            history={commHistory}
            delay={0.22}
          />
          <AnalyticsCard
            icon={Code2}
            label="Technical / Coding Score"
            feature="Feature 3 DSA · Feature 6 Daily"
            value={codeScore}
            color="#6ee7b7"
            glow="rgba(110,231,183,0.28)"
            history={codeHistory}
            delay={0.28}
          />
        </div>
      </div>

      {/* ── Activity summary strip ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="rounded-2xl p-5 flex flex-wrap gap-5 items-center"
        style={{
          background: "rgba(77, 76, 125, 0.15)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {[
          {
            icon: Activity,
            label: "Total Sessions",
            value: totalSessions,
            color: "#D8B9C3",
          },
          {
            icon: CheckCircle2,
            label: "Daily Challenges Done",
            value: challengesDone,
            color: "#6ee7b7",
          },
          {
            icon: Calendar,
            label: "Current Streak",
            value: `${streak} days`,
            color: "#f97316",
          },
          {
            icon: TrendingUp,
            label: "Aggregate Readiness",
            value: `${Math.round(
              (resumeScore * 0.25 + aptitudeScore * 0.30 + codeScore * 0.25 + commScore * 0.20)
            )}%`,
            color: "#fbbf24",
          },
          {
            icon: Target,
            label: "Target Role",
            value: role,
            color: "#a5f3fc",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-3 min-w-[140px]">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-[10px] text-white/30 font-sans">{label}</p>
              <p className="text-sm font-display font-bold text-white">{value}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
