import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  FileText,
  FlaskConical,
  Code2,
  Mic2,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Target,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 5: Placement Readiness Dashboard
//
// Pure mathematical aggregator. NO AI calls are made. Reads four metric vectors
// from the user's MongoDB document and computes a weighted Aggregate Readiness
// Index that represents overall placement preparedness.
//
// Metric Sources:
//   1. Resume Score      → feature_data.scores.resume_analyzer.bestPercentage
//                           or a flat value from the analysis XP (20 XP = 100%)
//   2. Aptitude Accuracy → Mean of all aptitude-lab entries in assessment_history
//   3. Code Ratio        → best % from dsa_arena scores map
//   4. Comm. Index       → most recent mock-interview confidenceScore from
//                           feature_data.active_interview.confidenceScore
// ─────────────────────────────────────────────────────────────────────────────

// ── Weighted contribution of each vector to the Aggregate Index ───────────────
const WEIGHTS = {
  resume:    0.25,
  aptitude:  0.30,
  dsa:       0.25,
  comms:     0.20,
};

// ── Tier classification for the radial score ─────────────────────────────────
function getTier(score) {
  if (score >= 85) return { label: "Placement Ready",     color: "#6ee7b7", glow: "rgba(110,231,183,0.3)"  };
  if (score >= 70) return { label: "Strong Candidate",    color: "#a5f3fc", glow: "rgba(165,243,252,0.3)"  };
  if (score >= 50) return { label: "On Track",            color: "#D8B9C3", glow: "rgba(216,185,195,0.3)"  };
  return              { label: "Needs Improvement",    color: "#fca5a5", glow: "rgba(252,165,165,0.3)"  };
}

// ── Animated radial ring ──────────────────────────────────────────────────────
function RadialGauge({ score, tier }) {
  const radius = 72;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference   = 2 * Math.PI * normalizedRadius;
  const dashOffset      = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(ellipse at center, ${tier.glow} 0%, transparent 70%)` }}
      />
      <svg width={180} height={180} viewBox="0 0 180 180" style={{ transform: "rotate(-90deg)" }}>
        {/* Track ring */}
        <circle
          cx={90} cy={90} r={normalizedRadius}
          fill="none" strokeWidth={stroke}
          stroke="rgba(255,255,255,0.06)"
        />
        {/* Progress ring */}
        <motion.circle
          cx={90} cy={90} r={normalizedRadius}
          fill="none" strokeWidth={stroke}
          stroke={tier.color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${tier.color})` }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          className="text-4xl font-display font-black leading-none"
          style={{ color: tier.color }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-display font-semibold uppercase tracking-widest text-white/40 mt-1">
          / 100
        </span>
      </div>
    </div>
  );
}

// ── Single metric card ────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, color, glow, description, weight, delay = 0 }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: "rgba(77, 76, 125, 0.2)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Corner glow */}
      <div
        className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${glow} 0%, transparent 70%)` }}
      />

      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${glow.replace("0.3", "0.12")}`, border: `1px solid ${glow.replace("0.3", "0.4")}` }}
        >
          <Icon size={17} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-white/40 mb-0.5">
            {label}
          </p>
          <p className="text-2xl font-display font-black text-white leading-none">
            {pct}<span className="text-sm font-sans font-normal text-white/40 ml-0.5">%</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="rounded-full overflow-hidden mb-3"
        style={{ height: 4, background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: "easeOut", delay: delay + 0.2 }}
        />
      </div>

      <p className="text-[11px] text-white/50 font-sans leading-relaxed">{description}</p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-display text-white/30 uppercase tracking-wider">
          Weight: {Math.round(weight * 100)}%
        </span>
        <span
          className="text-[10px] font-display font-bold"
          style={{ color: pct >= 70 ? "#6ee7b7" : pct >= 50 ? "#fbbf24" : "#fca5a5" }}
        >
          {pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Fair" : "Needs Work"}
        </span>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function PlacementReadinessDashboard({ setActiveView }) {
  const [user, setUser]       = useState(() => JSON.parse(localStorage.getItem("nexora_user") || "{}"));
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  // ── Sync fresh data from MongoDB on mount ────────────────────────────────
  useEffect(() => {
    const sync = async () => {
      setLoading(true);
      try {
        const res = await api.get("/auth/me");
        if (res.data?.success && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem("nexora_user", JSON.stringify(res.data.user));
          setLastSynced(new Date());
        }
      } catch (err) {
        console.warn("Analytics sync failed (using local cache):", err.message);
      } finally {
        setLoading(false);
      }
    };
    sync();
  }, []);

  // ── Derive four metric vectors from user.feature_data ────────────────────
  const metrics = useMemo(() => {
    const fd = user?.feature_data || {};
    const scores = fd.scores || {};
    const history = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];

    // 1. Resume Score — 20 XP awarded on completion = 100% baseline.
    //    If the analysis analysis XP was awarded, map 20XP → 100%.
    //    Fallback: check scores map for 'resume_analyzer'.
    let resumeScore = 0;
    if (fd.analysisCompleted) {
      // Analysis was completed — base score is 100, we don't have a fine-grained %
      // but check if there's a scores entry for it.
      const rsMap = scores["resume_analyzer"];
      resumeScore = rsMap?.bestPercentage ?? (fd.analysisCompleted ? 100 : 0);
    }

    // 2. Aptitude Accuracy — mean of all aptitude-lab entries in assessment_history
    const aptitudeEntries = history.filter(
      (e) => e.module === "aptitude-lab" || e.module === "aptitude_lab"
    );
    const aptitudeScore =
      aptitudeEntries.length > 0
        ? Math.round(
            aptitudeEntries.reduce((sum, e) => sum + (e.percentage ?? 0), 0) /
              aptitudeEntries.length
          )
        : scores["aptitude_lab"]?.bestPercentage ?? 0;

    // 3. Code Solving Ratio — best % from dsa_arena scores map
    const dsaScore = scores["dsa_arena"]?.bestPercentage ?? 0;

    // 4. Communication Index — confidence score from most recent interview evaluation
    const commScore = fd.active_interview?.confidenceScore ?? 0;

    return { resumeScore, aptitudeScore, dsaScore, commScore };
  }, [user]);

  // ── Weighted Aggregate Readiness Index ───────────────────────────────────
  const aggregate = useMemo(() => {
    const { resumeScore, aptitudeScore, dsaScore, commScore } = metrics;
    const raw =
      resumeScore    * WEIGHTS.resume   +
      aptitudeScore  * WEIGHTS.aptitude +
      dsaScore       * WEIGHTS.dsa      +
      commScore      * WEIGHTS.comms;
    return Math.min(100, Math.round(raw));
  }, [metrics]);

  const tier = getTier(aggregate);

  // ── Check if any module has been unlocked yet ────────────────────────────
  const hasAnyData =
    metrics.resumeScore > 0 ||
    metrics.aptitudeScore > 0 ||
    metrics.dsaScore > 0 ||
    metrics.commScore > 0;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                       font-display font-semibold uppercase tracking-widest border mb-3"
            style={{
              background: "rgba(216, 185, 195, 0.08)",
              borderColor: "rgba(216, 185, 195, 0.25)",
              color: "#D8B9C3",
            }}
          >
            <TrendingUp size={9} /> Feature 5 — Analytics
          </span>
          <h1 className="text-2xl font-display font-black text-white tracking-tight">
            Placement Readiness Dashboard
          </h1>
          <p className="text-sm text-white/50 mt-1 font-sans">
            Mathematical aggregation of your 4 core performance vectors.
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => {
            setLoading(true);
            api.get("/auth/me").then((res) => {
              if (res.data?.success) {
                setUser(res.data.user);
                localStorage.setItem("nexora_user", JSON.stringify(res.data.user));
                setLastSynced(new Date());
              }
            }).catch(console.warn).finally(() => setLoading(false));
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-display font-semibold
                     text-white/60 hover:text-white transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          {loading ? "Syncing..." : "Refresh"}
        </button>
      </motion.div>

      {/* ── No data guard ────────────────────────────────────────────────── */}
      {!hasAnyData && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-8 text-center mb-8"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}
        >
          <AlertCircle size={24} className="mx-auto mb-3 text-amber-400" />
          <h3 className="text-sm font-display font-bold text-white mb-1">No Performance Data Yet</h3>
          <p className="text-xs text-white/50 font-sans max-w-sm mx-auto">
            Complete at least one practice module (Aptitude Lab, DSA Arena, or Mock Interview) to see your Readiness Index populate.
          </p>
          <button
            onClick={() => setActiveView("aptitude-lab")}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display font-black text-plum tracking-wide"
            style={{ backgroundColor: "#D8B9C3" }}
          >
            Start Aptitude Lab →
          </button>
        </motion.div>
      )}

      {/* ── Central Aggregate Radial ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-2xl p-8 mb-8 flex flex-col lg:flex-row items-center gap-8 relative overflow-hidden"
        style={{
          background: "rgba(77, 76, 125, 0.22)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Ambient radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${tier.glow.replace("0.3", "0.08")} 0%, transparent 60%)` }}
        />

        {/* Gauge */}
        <div className="flex flex-col items-center gap-4 flex-shrink-0">
          <RadialGauge score={aggregate} tier={tier} />
          <div className="text-center">
            <p
              className="text-sm font-display font-black tracking-wide"
              style={{ color: tier.color }}
            >
              {tier.label}
            </p>
            <p className="text-[10px] text-white/35 font-sans mt-0.5">
              Aggregate Readiness Index
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 w-full">
          <h2 className="text-base font-display font-bold text-white mb-4">
            Weighted Score Breakdown
          </h2>
          <div className="space-y-3">
            {[
              { label: "Resume Analysis",     value: metrics.resumeScore,    color: "#D8B9C3", weight: WEIGHTS.resume   },
              { label: "Aptitude Accuracy",   value: metrics.aptitudeScore,  color: "#a5f3fc", weight: WEIGHTS.aptitude },
              { label: "Code Solving Ratio",  value: metrics.dsaScore,       color: "#6ee7b7", weight: WEIGHTS.dsa      },
              { label: "Communication Index", value: metrics.commScore,      color: "#fbbf24", weight: WEIGHTS.comms    },
            ].map(({ label, value, color, weight }) => {
              const pct = Math.min(100, Math.max(0, Math.round(value)));
              const contribution = Math.round(pct * weight);
              return (
                <div key={label}>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="font-sans text-white/70">{label}</span>
                    <span className="font-display font-bold" style={{ color }}>
                      {pct}% <span className="text-white/30 font-normal">→ {contribution}pts</span>
                    </span>
                  </div>
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ height: 5, background: "rgba(255,255,255,0.06)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {lastSynced && (
            <p className="text-[10px] text-white/25 font-sans mt-4">
              Last synced: {lastSynced.toLocaleTimeString()}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── 4 Metric Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <MetricCard
          icon={FileText}
          label="Resume Score"
          value={metrics.resumeScore}
          color="#D8B9C3"
          glow="rgba(216,185,195,0.3)"
          description="Profile analysis completion score. Awarded after the AI reviews your resume, portfolio and LinkedIn gaps."
          weight={WEIGHTS.resume}
          delay={0.15}
        />
        <MetricCard
          icon={FlaskConical}
          label="Aptitude Accuracy"
          value={metrics.aptitudeScore}
          color="#a5f3fc"
          glow="rgba(165,243,252,0.3)"
          description="Mean correct-answer rate across all Aptitude Lab sessions completed so far."
          weight={WEIGHTS.aptitude}
          delay={0.22}
        />
        <MetricCard
          icon={Code2}
          label="Code Solving Ratio"
          value={metrics.dsaScore}
          color="#6ee7b7"
          glow="rgba(110,231,183,0.3)"
          description="Best performance percentage achieved in the DSA Arena across all coding sessions."
          weight={WEIGHTS.dsa}
          delay={0.29}
        />
        <MetricCard
          icon={Mic2}
          label="Communication Index"
          value={metrics.commScore}
          color="#fbbf24"
          glow="rgba(251,191,36,0.3)"
          description="Verbal confidence score from your most recent Mock Interview Gemini evaluation — penalized for fillers, stutters, and silence pauses."
          weight={WEIGHTS.comms}
          delay={0.36}
        />
      </div>

      {/* ── Improvement CTA Row ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          background: "rgba(77, 76, 125, 0.18)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} style={{ color: "#D8B9C3" }} />
            <p className="text-sm font-display font-bold text-white">Improve Your Index</p>
          </div>
          <p className="text-xs text-white/50 font-sans">
            Each completed module session automatically refreshes this dashboard.
          </p>
        </div>
       <div className="flex flex-wrap gap-2 flex-shrink-0">

  {/* Daily Placement Challenge Button */}
  <motion.button
    onClick={() => setActiveView("daily-challenge")}
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.97 }}
    className="px-5 py-2 rounded-xl text-xs font-display font-black transition-all duration-200"
    style={{
      background: "linear-gradient(135deg,#D8B9C3 0%, #CFA7B5 100%)",
      color: "#2B2140",
      boxShadow: "0 0 18px rgba(216,185,195,.30)",
    }}
  >
    ✨ Daily Placement Challenge
  </motion.button>

  {[
    { label: "Aptitude Lab", id: "aptitude-lab" },
    { label: "DSA Arena", id: "dsa-arena" },
    { label: "Mock Interview", id: "mock-interviews" },
  ].map(({ label, id }) => (
    <button
      key={id}
      onClick={() => setActiveView(id)}
      className="px-4 py-2 rounded-xl text-xs font-display font-bold text-white/80
                 hover:text-white transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {label}
    </button>
  ))}

</div>
      </motion.div>
    </div>
  );
}
