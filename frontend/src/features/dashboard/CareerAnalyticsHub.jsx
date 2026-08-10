import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Flame,
  Star,
  FileText,
  FlaskConical,
  Mic2,
  Code2,
  Trophy,
  Crown,
  TrendingUp,
  Lock,
  Target,
  Activity,
  CheckCircle2,
  BrainCircuit,
} from "lucide-react";
import { getLevelProgress, evaluateBadges } from "../../lib/gamification";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Career Analytics Hub  (Feature 5 + Feature 8 merged)
//
// Three sections:
//   A. Gamification Summary — Level · XP · Streak · Achievement Badges
//   B. Recruiter Readiness Index — Weighted radial + 4 progress bars
//   C. Historical Trend Logs — sparklines for each skill vector
//
// Zero AI calls. Pure math on user.feature_data.
// Graceful baseline defaults — never crashes on empty data.
// ─────────────────────────────────────────────────────────────────────────────

// ── XP / level helpers ────────────────────────────────────────────────────────
const XP_PER_LEVEL = 500;
const xpToLevel      = (xp) => Math.max(1, Math.floor((xp || 0) / XP_PER_LEVEL) + 1);
const xpProgressPct  = (xp) => {
  const floor = (xpToLevel(xp) - 1) * XP_PER_LEVEL;
  const ceil  =  xpToLevel(xp)      * XP_PER_LEVEL;
  return Math.round(((xp - floor) / (ceil - floor)) * 100);
};

// ── Weighted readiness formula ────────────────────────────────────────────────
const WEIGHTS = { resume: 0.25, aptitude: 0.30, dsa: 0.25, comms: 0.20 };

function calcAggregate({ resumeScore, aptitudeScore, dsaScore, commScore }) {
  return Math.min(
    100,
    Math.round(
      resumeScore   * WEIGHTS.resume   +
      aptitudeScore * WEIGHTS.aptitude +
      dsaScore      * WEIGHTS.dsa      +
      commScore     * WEIGHTS.comms
    )
  );
}

// ── Tier label & palette ──────────────────────────────────────────────────────
function getTier(score) {
  if (score >= 85) return { label: "Placement Ready",  color: "#6ee7b7", glow: "rgba(110,231,183,0.35)" };
  if (score >= 70) return { label: "Strong Candidate", color: "#a5f3fc", glow: "rgba(165,243,252,0.35)" };
  if (score >= 50) return { label: "On Track",         color: "#D8B9C3", glow: "rgba(216,185,195,0.35)" };
  return              { label: "Getting Started",  color: "#fca5a5", glow: "rgba(252,165,165,0.35)" };
}

// ── Badge definitions ─────────────────────────────────────────────────────────
const BADGES = [
  { id: "resume",      label: "Resume Master",       icon: FileText,    color: "#D8B9C3", glow: "rgba(216,185,195,0.5)", unlockKey: "analysisCompleted"   },
  { id: "aptitude",    label: "Aptitude Champion",   icon: FlaskConical,color: "#a5f3fc", glow: "rgba(165,243,252,0.5)", unlockKey: "aptitude_champion"   },
  { id: "comms",       label: "Communication Pro",   icon: Mic2,        color: "#fbbf24", glow: "rgba(251,191,36,0.5)",  unlockKey: "comms_pro"           },
  { id: "interview",   label: "Interview Expert",    icon: BrainCircuit,color: "#6ee7b7", glow: "rgba(110,231,183,0.5)", unlockKey: "interview_expert"    },
  { id: "consistency", label: "Consistency Champ",   icon: Flame,       color: "#f97316", glow: "rgba(249,115,22,0.5)",  unlockKey: "consistency_champion"},
];

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

// ── Animated horizontal progress bar ─────────────────────────────────────────
function Bar({ value, color, delay = 0, height = 5 }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      className="rounded-full overflow-hidden w-full"
      style={{ height, background: "rgba(255,255,255,0.07)" }}
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

// ── CSS sparkline from array of percentage values ─────────────────────────────
function Sparkline({ values = [], color, maxH = 28 }) {
  const filled = values.length > 0 ? values.slice(-9) : Array(6).fill(0);
  const max    = Math.max(...filled, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height: maxH }}>
      {filled.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-sm"
          style={{ background: v > 0 ? color : "rgba(255,255,255,0.07)", opacity: v > 0 ? 0.55 + (i / filled.length) * 0.45 : 1 }}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(v > 0 ? 14 : 8, (v / max) * 100)}%` }}
          transition={{ duration: 0.45, delay: i * 0.05, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ── Animated SVG Radial Gauge ─────────────────────────────────────────────────
function RadialGauge({ score, tier, size = 156 }) {
  const radius     = size / 2 - 10;
  const stroke     = 9;
  const norm       = radius - stroke / 2;
  const circ       = 2 * Math.PI * norm;
  const dashOffset = circ - (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${tier.glow.replace("0.35", "0.15")} 0%, transparent 70%)` }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={norm} fill="none" strokeWidth={stroke} stroke="rgba(255,255,255,0.07)" />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={norm}
          fill="none" strokeWidth={stroke} stroke={tier.color}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${tier.color})` }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          className="text-4xl font-display font-black leading-none"
          style={{ color: tier.color }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          {score}
        </motion.span>
        <span className="text-[9px] font-sans text-white/35 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ── Single badge chip ─────────────────────────────────────────────────────────
const BADGE_ICONS = {
  resume_master:        FileText,
  aptitude_champion:    FlaskConical,
  comms_pro:            Mic2,
  interview_expert:     BrainCircuit,
  consistency_champion: Flame,
};

function BadgeChip({ badge, delay }) {
  const Icon = BADGE_ICONS[badge.id] || Trophy;
  const unlocked = badge.unlocked;
  const color = badge.accent || "#D8B9C3";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-2xl text-center relative group"
      style={{
        background: unlocked ? `${color}14` : "rgba(255,255,255,0.03)",
        border:     unlocked ? `1px solid ${color}60` : "1px solid rgba(255,255,255,0.07)",
        boxShadow:  unlocked ? `0 0 14px ${color}25` : "none",
        minWidth:   110,
      }}
    >
      {!unlocked && <Lock size={10} className="absolute top-2 right-2 text-white/20" />}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: unlocked ? `${color}25` : "rgba(255,255,255,0.04)",
          border: `1.5px solid ${unlocked ? color : "rgba(255,255,255,0.1)"}`,
        }}
      >
        <Icon size={18} style={{ color: unlocked ? color : "rgba(255,255,255,0.2)" }} />
      </div>
      <div>
        <p className="text-[11px] font-display font-bold leading-tight" style={{ color: unlocked ? color : "rgba(255,255,255,0.3)" }}>
          {badge.label}
        </p>
        <p className="text-[9px] font-sans text-white/35 mt-0.5 max-w-[120px] leading-tight">
          {unlocked ? badge.desc : `🔒 ${badge.gateText}`}
        </p>
      </div>
    </motion.div>
  );
}

// ── A single vector progress row (Section B right panel + Section C) ──────────
function VectorRow({ icon: Icon, label, feature, value, color, delay }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const status = pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Fair" : pct > 0 ? "Needs Work" : "Not Started";
  const statusColor = pct >= 80 ? "#6ee7b7" : pct >= 60 ? "#fbbf24" : pct >= 40 ? "#D8B9C3" : "#fca5a5";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}40` }}
          >
            <Icon size={12} style={{ color }} />
          </div>
          <div>
            <p className="text-xs font-display font-bold text-white/90 leading-none">{label}</p>
            <p className="text-[9px] font-sans text-white/30 mt-0.5">{feature}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <span className="text-sm font-display font-black" style={{ color }}>{pct}</span>
          <span className="text-[10px] text-white/30 font-sans">%</span>
          <p className="text-[9px] font-display font-semibold" style={{ color: statusColor }}>{status}</p>
        </div>
      </div>
      <Bar value={pct} color={color} delay={delay + 0.1} height={4} />
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function CareerAnalyticsHub({ user: propUser, setUser, setActiveView }) {
  // ── Safe data extraction with full graceful defaults ──────────────────────
  const rawUser = propUser || JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const fd      = rawUser?.feature_data || {};
  const scores  = fd.scores || {};
  const history = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];

  const totalXP  = Math.max(0, rawUser?.totalXP ?? 0);
  const name     = rawUser?.name      ?? "Nexora Student";
  const lvlInfo  = useMemo(() => getLevelProgress(totalXP), [totalXP]);
  const level    = lvlInfo.level;
  const xpPct    = lvlInfo.pct;
  const streak   = fd.daily_streak_counter ?? 0;
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // ── Derive 4 metric vectors ───────────────────────────────────────────────
  const resumeScore = fd.analysisCompleted
    ? (scores["resume_analyzer"]?.bestPercentage ?? 100)
    : 0;

  const aptEntries = history.filter(
    (e) => e.module === "aptitude-lab" || e.module === "aptitude_lab"
  );
  const aptitudeScore = aptEntries.length > 0
    ? Math.round(aptEntries.reduce((s, e) => s + (e.percentage ?? 0), 0) / aptEntries.length)
    : scores["aptitude_lab"]?.bestPercentage ?? 0;

  const dsaScore = Math.max(
    scores["dsa_arena"]?.bestPercentage      ?? 0,
    scores["daily_challenge"]?.bestPercentage ?? 0
  );

  const commScore = fd.active_interview?.confidenceScore ?? 0;

  const aggregate = useMemo(
    () => calcAggregate({ resumeScore, aptitudeScore, dsaScore, commScore }),
    [resumeScore, aptitudeScore, dsaScore, commScore]
  );
  const tier = getTier(aggregate);

  // ── Badge evaluation with hardcore streak gates ───────────────────────────
  const badgeList   = useMemo(() => evaluateBadges(fd), [fd]);
  const earnedCount = badgeList.filter((b) => b.unlocked).length;

  // ── Sparkline history arrays (oldest→newest, capped at 9) ─────────────────
  const aptHistory  = aptEntries.slice(-9).reverse().map((e) => e.percentage ?? 0);
  const commEntries = history.filter((e) => e.module === "mock-interviews");
  const commHistory = commEntries.length > 0
    ? commEntries.slice(-9).reverse().map((e) => e.percentage ?? commScore)
    : commScore > 0 ? [commScore] : [];
  const codeEntries = history.filter(
    (e) => e.module === "dsa-arena" || e.module === "dsa_arena" || e.module === "daily-challenge"
  );
  const codeHistory = codeEntries.slice(-9).reverse().map((e) => e.percentage ?? 0);
  const resumeHistory = fd.analysisCompleted ? [resumeScore] : [];

  const vectors = [
    { icon: FileText,    label: "Resume Health",           feature: "Feature 1 · Profile Analysis", value: resumeScore,   color: "#D8B9C3", history: resumeHistory },
    { icon: FlaskConical,label: "Quantitative Aptitude",   feature: "Feature 3 · Aptitude Lab",      value: aptitudeScore, color: "#a5f3fc", history: aptHistory   },
    { icon: Code2,       label: "Coding Proficiency",      feature: "Feature 3 DSA + Feature 6",     value: dsaScore,      color: "#6ee7b7", history: codeHistory  },
    { icon: Mic2,        label: "Communication Confidence",feature: "Feature 4 · Mock Interview",    value: commScore,     color: "#fbbf24", history: commHistory  },
  ];

  const totalSessions = history.length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-7">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                     font-display font-semibold uppercase tracking-widest border mb-3"
          style={{ background: "rgba(216,185,195,0.08)", borderColor: "rgba(216,185,195,0.28)", color: "#D8B9C3" }}
        >
          <TrendingUp size={9} /> My Progress Hub
        </span>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-display font-black text-white tracking-tight">
              Career Analytics Hub
            </h1>
            <p className="text-sm text-white/45 mt-0.5 font-sans">
              Your complete placement performance dashboard — updated after every session.
            </p>
          </div>
          <p className="text-[10px] text-white/25 font-sans hidden sm:block">
            {totalSessions} sessions logged
          </p>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION A — Gamification Summary
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <p className="text-[9px] font-display font-bold uppercase tracking-widest text-white/25 mb-3">
          A · Gamification Summary
        </p>

        {/* Profile hero + XP bar + stat pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl p-5 mb-4 flex flex-wrap items-center gap-5 relative overflow-hidden"
          style={{
            background: "rgba(77, 76, 125, 0.28)",
            border: "1px solid rgba(216, 185, 195, 0.18)",
          }}
        >
          {/* Ambient */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(216,185,195,0.07) 0%, transparent 55%)" }} />

          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-display font-black"
            style={{
              background: "rgba(216,185,195,0.15)", border: "2px solid rgba(216,185,195,0.5)",
              color: "#D8B9C3", boxShadow: "0 0 18px rgba(216,185,195,0.15)",
            }}
          >
            {initials}
          </div>

          {/* Name / role */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-display font-black text-white truncate">{name}</p>
            <p className="text-xs text-white/45 font-sans">{rawUser?.targetRole ?? "Role not set"}</p>
            {/* XP progress bar */}
            <div className="mt-2.5 max-w-xs">
              <div className="flex justify-between text-[9px] text-white/30 font-display mb-1">
                <span>Level {level}</span>
                <span>{xpPct}% → Lv.{level + 1}</span>
              </div>
              <Bar value={xpPct} color="#D8B9C3" delay={0.25} height={4} />
            </div>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            {[
              { icon: Star,   label: "Level",   value: `Lv.${level}`, color: "#D8B9C3" },
              { icon: Zap,    label: "Total XP", value: totalXP.toLocaleString(), color: "#fbbf24" },
              { icon: Flame,  label: "Streak",   value: `${streak}d`,  color: "#f97316" },
              { icon: Trophy, label: "Badges",   value: `${earnedCount}/${BADGES.length}`, color: "#6ee7b7" },
            ].map(({ icon: Icon, label, value, color }, i) => (
              <div key={label}
                className="flex flex-col items-center px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon size={14} style={{ color }} className="mb-1" />
                <p className="text-[10px] text-white/35 font-sans">{label}</p>
                <p className="text-sm font-display font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Badge shelf */}
        <div className="flex flex-wrap gap-3">
          {badgeList.map((badge, i) => (
            <BadgeChip
              key={badge.id}
              badge={badge}
              delay={0.1 + i * 0.07}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION B — Recruiter Readiness Index
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <p className="text-[9px] font-display font-bold uppercase tracking-widest text-white/25 mb-3">
          B · Recruiter Readiness Index
        </p>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="rounded-2xl p-6 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
          style={{
            background: "rgba(77, 76, 125, 0.22)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Ambient radial */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${tier.glow.replace("0.35","0.07")} 0%, transparent 60%)` }} />

          {/* Radial gauge */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <RadialGauge score={aggregate} tier={tier} />
            <div className="text-center">
              <p className="text-sm font-display font-black tracking-wide" style={{ color: tier.color }}>
                {tier.label}
              </p>
              <p className="text-[9px] text-white/30 font-sans mt-0.5">Aggregate Readiness Index</p>
            </div>
          </div>

          {/* 4 vector progress rows */}
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-display font-bold text-white/60">Performance Vectors</h3>
              <span className="text-[9px] text-white/25 font-sans">Weight contribution shown</span>
            </div>
            {vectors.map(({ icon, label, feature, value, color }, i) => (
              <div key={label}>
                <VectorRow icon={icon} label={label} feature={feature} value={value} color={color} delay={0.15 + i * 0.08} />
                {/* Weight badge */}
                <div className="flex justify-end mt-1">
                  <span className="text-[9px] font-display text-white/25">
                    Weight: {Math.round(Object.values(WEIGHTS)[i] * 100)}% →&nbsp;
                    <span style={{ color }}>
                      {Math.round(Math.min(100, Math.max(0, value)) * Object.values(WEIGHTS)[i])}pts
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION C — Historical Trend Logs
      ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <p className="text-[9px] font-display font-bold uppercase tracking-widest text-white/25 mb-3">
          C · Historical Trend Logs
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vectors.map(({ icon: Icon, label, feature, value, color, history: hx }, i) => {
            const pct = Math.min(100, Math.max(0, Math.round(value)));
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.08 }}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: "rgba(77, 76, 125, 0.18)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                  style={{ background: `radial-gradient(circle at top right, ${color}18 0%, transparent 70%)` }} />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
                      <Icon size={13} style={{ color }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-display font-bold text-white/90">{label}</p>
                      <p className="text-[9px] font-sans text-white/30">{feature}</p>
                    </div>
                  </div>
                  <p className="text-xl font-display font-black flex-shrink-0" style={{ color }}>
                    {pct}<span className="text-sm text-white/30 font-sans">%</span>
                  </p>
                </div>

                {/* Sparkline */}
                <Sparkline values={hx} color={color} maxH={32} />

                {/* Session count tag */}
                <p className="text-[9px] text-white/20 font-sans mt-2">
                  {hx.length > 0 ? `${hx.length} session${hx.length > 1 ? "s" : ""} recorded` : "No sessions yet — start training!"}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Bottom CTA strip ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
        style={{ background: "rgba(77,76,125,0.14)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color: "#D8B9C3" }} />
          <p className="text-sm font-display font-bold text-white">Improve your index</p>
          <p className="text-xs text-white/40 font-sans hidden sm:block">
            — Each module session auto-updates every score above.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Aptitude Lab",   id: "aptitude-lab"    },
            { label: "DSA Arena",      id: "dsa-arena"       },
            { label: "Mock Interview", id: "mock-interviews" },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => setActiveView?.(id)}
              className="px-4 py-2 rounded-xl text-xs font-display font-bold text-white/70
                         hover:text-white transition-colors duration-200"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
