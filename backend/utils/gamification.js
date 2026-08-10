// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Gamification Engine  (backend/utils/gamification.js)
//
// Single source of truth for:
//   • XP award caps per module
//   • Exponential level-scaling formula
//   • Level-up calculation helper
//   • Badge unlock gate verification
//
// Import this anywhere XP is touched — NEVER inline magic numbers again.
// ─────────────────────────────────────────────────────────────────────────────

// ── Module XP caps ────────────────────────────────────────────────────────────
export const XP_CAPS = {
  aptitude:        5,   // 1 XP per correct answer, 5 questions max  → max  5 XP
  dsa_arena:      10,   // 2 XP per solved problem card, 5 cards max → max 10 XP
  mock_interview:  5,   // 0–5 XP linearly scaled from confidenceScore %
  daily_challenge:10,   // flat 10 XP on verified 4/4 checklist completion
};

// ── Exponential level formula ─────────────────────────────────────────────────
// XP needed to REACH level N  =  200 × N^1.5
// Level 1 → 200 XP
// Level 2 → 566 XP
// Level 5 → 2236 XP
// Level 10 → 6325 XP
export function xpThreshold(level) {
  return Math.round(200 * Math.pow(level, 1.5));
}

// Cumulative XP required to start level N
// = sum of xpThreshold(1..N-1)
export function cumulativeXPForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) total += xpThreshold(l);
  return total;
}

// Derive current level from raw total XP
export function calcLevel(totalXP) {
  let level = 1;
  while (cumulativeXPForLevel(level + 1) <= totalXP) {
    level++;
    if (level > 999) break; // safety cap
  }
  return level;
}

// XP within current level (0 → xpThreshold(level)) → percentage
export function levelProgress(totalXP) {
  const level    = calcLevel(totalXP);
  const floor    = cumulativeXPForLevel(level);
  const needed   = xpThreshold(level);
  return {
    level,
    floor,
    needed,
    xpInLevel: totalXP - floor,
    pct: Math.min(100, Math.round(((totalXP - floor) / needed) * 100)),
  };
}

// ── Per-module XP calculators ─────────────────────────────────────────────────

/** Aptitude Lab: 1 XP per correct answer, hard cap at XP_CAPS.aptitude */
export function calcAptitudeXP(correctCount) {
  return Math.min(correctCount * 1, XP_CAPS.aptitude);
}

/** DSA Arena: 2 XP per solved card, hard cap at XP_CAPS.dsa_arena */
export function calcDSAXP(solvedCount) {
  return Math.min(solvedCount * 2, XP_CAPS.dsa_arena);
}

/** Mock Interview: scale 0–5 XP from confidence percentage (0–100) */
export function calcInterviewXP(confidenceScore) {
  const pct = Math.max(0, Math.min(100, confidenceScore || 0));
  return Math.round((pct / 100) * XP_CAPS.mock_interview);
}

/** Daily Challenge: flat 10 XP — only call on verified 4/4 completion */
export function calcDailyChallengeXP() {
  return XP_CAPS.daily_challenge;
}

// ── awardXP — canonical helper used by every controller ──────────────────────
// Adds `amount` to user.totalXP and recalculates user.currentLevel.
// Mutates the user object in-place. Caller must still call user.save().
export function awardXP(user, amount) {
  const safeAmount = Math.max(0, Math.floor(amount));
  user.totalXP     = (user.totalXP || 0) + safeAmount;
  user.currentLevel = calcLevel(user.totalXP);
  return safeAmount; // return actual awarded amount for response payload
}

// ── Badge gate verification ───────────────────────────────────────────────────
// Each badge has BOTH a performance threshold AND a minimum streak gate.
// Returns { [badgeId]: boolean } for all 5 badges.
export function evaluateBadges(fd) {
  const scores        = fd.scores || {};
  const history       = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];
  const streak        = fd.daily_streak_counter ?? 0;

  // Resume Master — requires completed analysis AND a minimum 2-day streak
  const resumeMaster  = !!fd.analysisCompleted && streak >= 2;

  // Aptitude Champion — avg aptitude score ≥ 80% AND streak ≥ 5
  const aptEntries    = history.filter(
    (e) => e.module === "aptitude-lab" || e.module === "aptitude_lab"
  );
  const aptAvg        = aptEntries.length > 0
    ? Math.round(aptEntries.reduce((s, e) => s + (e.percentage ?? 0), 0) / aptEntries.length)
    : (scores["aptitude_lab"]?.bestPercentage ?? 0);
  const aptitudeChampion = aptAvg >= 80 && streak >= 5;

  // Communication Pro — confidenceScore ≥ 75% (no streak gate)
  const commScore     = fd.active_interview?.confidenceScore ?? 0;
  const commsPro      = commScore >= 75;

  // Interview Expert — ≥ 3 mock interview sessions AND streak ≥ 7
  const interviewCount = history.filter(
    (e) => e.module === "mock-interviews" || e.module === "mock_interviews"
  ).length;
  const interviewExpert = interviewCount >= 3 && streak >= 7;

  // Consistency Champion — streak ≥ 14 (all-streak, no performance gate)
  const consistencyChampion = streak >= 14;

  return {
    resume_master:         resumeMaster,
    aptitude_champion:     aptitudeChampion,
    comms_pro:             commsPro,
    interview_expert:      interviewExpert,
    consistency_champion:  consistencyChampion,
  };
}
