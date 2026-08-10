// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Client Gamification Engine (frontend/src/lib/gamification.js)
//
// Shared exponential level scaling & badge gate verification.
// Level formula: Next Level XP Target = 200 * (Current_Level ^ 1.5)
// ─────────────────────────────────────────────────────────────────────────────

export function xpThreshold(level) {
  return Math.round(200 * Math.pow(level, 1.5));
}

export function cumulativeXPForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpThreshold(l);
  }
  return total;
}

export function calcLevel(totalXP) {
  let level = 1;
  while (cumulativeXPForLevel(level + 1) <= (totalXP || 0)) {
    level++;
    if (level > 999) break;
  }
  return level;
}

export function getLevelProgress(totalXP) {
  const safeXP = Math.max(0, totalXP || 0);
  const level  = calcLevel(safeXP);
  const floor  = cumulativeXPForLevel(level);
  const needed = xpThreshold(level);
  const inLvl  = safeXP - floor;
  const pct    = Math.min(100, Math.max(0, Math.round((inLvl / needed) * 100)));
  const nextTarget = floor + needed;

  return {
    level,
    floor,
    needed,
    xpInLevel: inLvl,
    xpToNext: needed - inLvl,
    nextTarget,
    pct,
  };
}

/**
 * Strict Badge Verification Logic — Forest-App Hardcore Gate System:
 *  - Resume Master: Analysis completed AND streak >= 2 days
 *  - Aptitude Champion: Avg Aptitude score >= 80% AND streak >= 5 days
 *  - Communication Pro: Confidence score >= 75%
 *  - Interview Expert: >= 3 sessions completed AND streak >= 7 days
 *  - Consistency Champion: Flawless streak >= 14 days
 */
export function evaluateBadges(featureData = {}) {
  const fd      = featureData || {};
  const scores   = fd.scores || {};
  const history  = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];
  const streak   = fd.daily_streak_counter ?? 0;

  // 1. Resume Master — requires both a completed analysis AND a 2-day streak
  const resumeMaster = !!fd.analysisCompleted && streak >= 2;

  // 2. Aptitude Champion (Avg >= 80% AND streak >= 5)
  const aptEntries = history.filter(
    (e) => e.module === "aptitude-lab" || e.module === "aptitude_lab"
  );
  const aptAvg = aptEntries.length > 0
    ? Math.round(aptEntries.reduce((s, e) => s + (e.percentage ?? 0), 0) / aptEntries.length)
    : (scores["aptitude_lab"]?.bestPercentage ?? 0);
  const aptitudeChampion = aptAvg >= 80 && streak >= 5;

  // 3. Communication Pro (Confidence >= 75%)
  const commScore = fd.active_interview?.confidenceScore ?? 0;
  const commsPro  = commScore >= 75;

  // 4. Interview Expert (Sessions >= 3 AND streak >= 7)
  const interviewCount = history.filter(
    (e) => e.module === "mock-interviews" || e.module === "mock_interviews"
  ).length;
  const interviewExpert = interviewCount >= 3 && streak >= 7;

  // 5. Consistency Champion (Streak >= 14)
  const consistencyChampion = streak >= 14;

  return [
    {
      id: "resume_master",
      label: "Resume Master",
      desc: "AI audit complete + 2-Day Streak",
      unlocked: resumeMaster,
      accent: "#D8B9C3",
      gateText: "Complete Resume Audit + Streak ≥ 2d",
    },
    {
      id: "aptitude_champion",
      label: "Aptitude Champion",
      desc: "Avg Score ≥ 80% & 5-Day Streak",
      unlocked: aptitudeChampion,
      accent: "#a5f3fc",
      gateText: "Avg ≥ 80% + Streak ≥ 5d",
    },
    {
      id: "comms_pro",
      label: "Communication Pro",
      desc: "Interview Verbal Score ≥ 75%",
      unlocked: commsPro,
      accent: "#fbbf24",
      gateText: "Confidence ≥ 75%",
    },
    {
      id: "interview_expert",
      label: "Interview Expert",
      desc: "3 Sessions Done & 7-Day Streak",
      unlocked: interviewExpert,
      accent: "#6ee7b7",
      gateText: "3 Sessions + Streak ≥ 7d",
    },
    {
      id: "consistency_champion",
      label: "Consistency Champ",
      desc: "Active Streak ≥ 14 Days",
      unlocked: consistencyChampion,
      accent: "#f97316",
      gateText: "Streak ≥ 14d",
    },
  ];
}
