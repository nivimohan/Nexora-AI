import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Crown,
  Zap,
  Trophy,
  Star,
  Medal,
  FileText,
  FlaskConical,
  Mic2,
  Users,
  Flame,
  Lock,
  BrainCircuit,
  Loader2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { calcLevel, evaluateBadges } from "../../lib/gamification";
import api from "../../lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 7: Campus Leaderboard
//
// Fetches ONLY real registered users from the backend MongoDB via
// GET /api/leaderboard. No seeded peer arrays.
//
// Empty state: "Only you are on the board right now — keep earning XP!"
// ─────────────────────────────────────────────────────────────────────────────

// ── Badge definitions ─────────────────────────────────────────────────────────
const BADGE_ICONS = {
  resume_master:        FileText,
  aptitude_champion:    FlaskConical,
  comms_pro:            Mic2,
  interview_expert:     BrainCircuit,
  consistency_champion: Flame,
};

// ── Rank medal styling ────────────────────────────────────────────────────────
function getRankStyle(rank) {
  if (rank === 1) return { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.4)",   Icon: Crown  };
  if (rank === 2) return { color: "#e2e8f0", bg: "rgba(226,232,240,0.1)", border: "rgba(226,232,240,0.35)", Icon: Medal  };
  if (rank === 3) return { color: "#fb923c", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.35)",  Icon: Trophy };
  return           { color: "#7c6b8a",       bg: "rgba(124,107,138,0.08)", border: "rgba(124,107,138,0.2)", Icon: Star   };
}

// ════════════════════════════════════════════════════════════════════════════
// LEADERBOARD ROW
// ════════════════════════════════════════════════════════════════════════════
function LeaderRow({ entry, rank, isMe, delay }) {
  const style = getRankStyle(rank);
  const RankIcon = style.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${isMe ? "ring-1" : ""}`}
      style={{
        background: isMe
          ? "rgba(216, 185, 195, 0.1)"
          : rank <= 3
          ? style.bg
          : "rgba(77, 76, 125, 0.18)",
        border: isMe
          ? "1px solid rgba(216, 185, 195, 0.45)"
          : `1px solid ${style.border}`,
      }}
    >
      {/* Rank badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: style.bg, border: `1px solid ${style.border}` }}
      >
        {rank <= 3 ? (
          <RankIcon size={17} style={{ color: style.color }} />
        ) : (
          <span className="text-xs font-display font-black" style={{ color: style.color }}>
            #{rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-display font-black"
        style={{
          background: isMe ? "rgba(216,185,195,0.2)" : "rgba(255,255,255,0.07)",
          color:      isMe ? "#D8B9C3" : "rgba(255,255,255,0.7)",
          border:     isMe ? "1px solid rgba(216,185,195,0.35)" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {entry.avatar}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-display font-bold truncate ${isMe ? "text-white" : "text-white/90"}`}>
            {entry.name}
          </p>
          {isMe && (
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-wider"
              style={{ background: "rgba(216,185,195,0.2)", color: "#D8B9C3", border: "1px solid rgba(216,185,195,0.3)" }}
            >
              You
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/40 font-sans truncate">{entry.role}</p>
      </div>

      {/* Level + streak (desktop) */}
      <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="text-[10px] font-display text-white/35">Lv.{entry.level}</span>
        <div className="flex items-center gap-1">
          <Flame size={10} className="text-orange-400" />
          <span className="text-[10px] font-sans text-white/35">{entry.streak}d</span>
        </div>
      </div>

      {/* XP */}
      <div className="flex-shrink-0 text-right ml-2">
        <div className="flex items-center gap-1 justify-end">
          <Zap size={12} style={{ color: style.color }} />
          <span className="text-sm font-display font-black" style={{ color: style.color }}>
            {(entry.xp || 0).toLocaleString()}
          </span>
        </div>
        <p className="text-[10px] text-white/30 font-sans text-right">XP</p>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BADGE CARD
// ════════════════════════════════════════════════════════════════════════════
function BadgeCard({ badge, delay }) {
  const Icon = BADGE_ICONS[badge.id] || Trophy;
  const unlocked = badge.unlocked;
  const color = badge.accent || "#D8B9C3";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="relative flex flex-col items-center gap-2 p-4 rounded-2xl text-center transition-all duration-200"
      style={{
        background: unlocked ? `${color}14` : "rgba(255,255,255,0.03)",
        border:     unlocked ? `1px solid ${color}55` : "1px solid rgba(255,255,255,0.07)",
        boxShadow:  unlocked ? `0 0 18px ${color}25` : "none",
      }}
    >
      {!unlocked && (
        <div className="absolute top-2.5 right-2.5">
          <Lock size={10} className="text-white/20" />
        </div>
      )}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: unlocked ? `${color}25` : "rgba(255,255,255,0.04)",
          border:     unlocked ? `1.5px solid ${color}` : "1.5px solid rgba(255,255,255,0.1)",
        }}
      >
        <Icon size={22} style={{ color: unlocked ? color : "rgba(255,255,255,0.2)" }} />
      </div>
      <p
        className="text-[11px] font-display font-bold leading-tight"
        style={{ color: unlocked ? color : "rgba(255,255,255,0.3)" }}
      >
        {badge.label}
      </p>
      <p className="text-[9px] text-white/30 font-sans leading-tight">
        {unlocked ? badge.desc : `🔒 ${badge.gateText}`}
      </p>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function LeaderboardPage({ user: propUser }) {
  // ── Defensive user extraction ─────────────────────────────────────────────
  const rawUser  = propUser || JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const fd       = rawUser?.feature_data || {};

  const myId     = rawUser?._id || rawUser?.id;
  const myXP     = rawUser?.totalXP     ?? 0;
  const myName   = rawUser?.name        ?? "You";
  const myRole   = rawUser?.targetRole  ?? "Nexora Student";
  const myLevel  = rawUser?.currentLevel ?? calcLevel(myXP);
  const myStreak = fd.daily_streak_counter ?? 0;
  const myAvatar = myName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // ── Live leaderboard state ────────────────────────────────────────────────
  const [board,   setBoard]   = useState(null); // null = loading
  const [fetchErr, setFetchErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.get("/leaderboard")
      .then((res) => {
        if (!cancelled && res.data?.success) {
          setBoard(res.data.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[Leaderboard] fetch error:", err);
          setFetchErr("Could not load leaderboard. Please try again later.");
          // Graceful degradation: show only the current user
          setBoard([]);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // ── Merge API data with the current user to ensure "You" row is always shown ─
  const ranked = useMemo(() => {
    if (board === null) return null; // still loading

    // If "me" is already in the board result, mark it; otherwise inject it
    let list = board.map((entry) => ({
      ...entry,
      isMe: entry.id === myId || entry.name === myName,
    }));

    const meInList = list.some((e) => e.isMe);
    if (!meInList) {
      list = [
        {
          id:     myId || "me",
          name:   myName,
          avatar: myAvatar,
          xp:     myXP,
          level:  myLevel,
          streak: myStreak,
          role:   myRole,
          isMe:   true,
        },
        ...list,
      ].sort((a, b) => b.xp - a.xp);
    }

    return list;
  }, [board, myId, myName, myAvatar, myXP, myLevel, myStreak, myRole]);

  const myRank = ranked ? (ranked.findIndex((e) => e.isMe) + 1) : "—";

  // ── Badge unlock states ───────────────────────────────────────────────────
  const badgeList = useMemo(() => evaluateBadges(fd), [fd]);

  // ── LOADING STATE ─────────────────────────────────────────────────────────
  if (ranked === null) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[460px] gap-4">
        <Loader2 size={26} className="animate-spin text-amber-300" />
        <p className="text-sm text-white/40 font-sans">Loading campus rankings…</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                     font-display font-semibold uppercase tracking-widest border mb-3"
          style={{
            background:  "rgba(251,191,36,0.08)",
            borderColor: "rgba(251,191,36,0.25)",
            color: "#fbbf24",
          }}
        >
          <Trophy size={9} /> Feature 7 — Leaderboard
        </span>
        <h1 className="text-2xl font-display font-black text-white tracking-tight">
          Campus Rankings
        </h1>
        <p className="text-sm text-white/50 mt-1 font-sans">
          Live XP-sorted leaderboard · Rankings update as you earn XP across all modules.
        </p>
      </motion.div>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {fetchErr && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(252,165,165,0.08)", border: "1px solid rgba(252,165,165,0.2)" }}
          >
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300 font-sans">{fetchErr}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Your rank spotlight banner ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl p-5 mb-7 flex items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background: "rgba(77, 76, 125, 0.28)",
          border:     "1px solid rgba(216, 185, 195, 0.25)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 100% 50%, rgba(216,185,195,0.07) 0%, transparent 60%)" }}
        />
        <div>
          <p className="text-[10px] font-display uppercase tracking-widest text-white/35 mb-0.5">Your Rank</p>
          <p className="text-3xl font-display font-black text-white">#{myRank}</p>
          <p className="text-xs text-white/50 font-sans mt-0.5">of {ranked.length} student{ranked.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="w-px h-12 bg-white/8" />
        <div>
          <p className="text-[10px] font-display uppercase tracking-widest text-white/35 mb-0.5">Total XP</p>
          <div className="flex items-center gap-1">
            <Zap size={16} className="text-amber-300" />
            <p className="text-3xl font-display font-black text-amber-300">{myXP.toLocaleString()}</p>
          </div>
        </div>
        <div className="w-px h-12 bg-white/8" />
        <div>
          <p className="text-[10px] font-display uppercase tracking-widest text-white/35 mb-0.5">Level</p>
          <p className="text-3xl font-display font-black text-white">Lv.{myLevel}</p>
        </div>
        <div className="w-px h-12 bg-white/8" />
        <div>
          <p className="text-[10px] font-display uppercase tracking-widest text-white/35 mb-0.5">Streak</p>
          <div className="flex items-center gap-1">
            <Flame size={16} className="text-orange-400" />
            <p className="text-3xl font-display font-black text-white">{myStreak}d</p>
          </div>
        </div>
      </motion.div>

      {/* ── Rankings list ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-xs font-display font-bold text-white/40 uppercase tracking-widest mb-4">
          Full Rankings
        </h2>

        {ranked.length === 0 ? (
          /* Empty state — no users in DB at all (should not happen, but graceful) */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl text-center"
            style={{ background: "rgba(77,76,125,0.14)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <TrendingUp size={28} className="text-white/15" />
            <p className="text-sm font-display font-bold text-white/30">No rankings yet</p>
            <p className="text-xs text-white/20 font-sans max-w-xs">
              Complete daily challenges and practice modules to appear on the campus leaderboard!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {ranked.map((entry, i) => (
              <LeaderRow
                key={entry.id}
                entry={entry}
                rank={i + 1}
                isMe={entry.isMe}
                delay={i * 0.06}
              />
            ))}

            {/* Peer empty-state hint when only 1 user (just "You") */}
            {ranked.length === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 px-5 py-4 rounded-2xl text-center"
                style={{ background: "rgba(77,76,125,0.14)", border: "1px dashed rgba(255,255,255,0.1)" }}
              >
                <p className="text-xs font-sans text-white/30 leading-relaxed">
                  🏆 You're at the top! Complete daily challenges to climb the campus leaderboard as more students join.
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* ── Achievement Badges ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-display font-bold text-white/40 uppercase tracking-widest">
            Achievement Badges
          </h2>
          <p className="text-[10px] font-sans text-white/25">
            {badgeList.filter((b) => b.unlocked).length} / {badgeList.length} Unlocked
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {badgeList.map((badge, i) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              delay={0.1 + i * 0.07}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
