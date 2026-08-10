import User from "../models/User.js";
import { calcDSAXP, awardXP } from "../utils/gamification.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Unified Assessment Submission Controller
// POST /api/submit-assessment
//
// Unified telemetry sink for all practice modules (DSA Arena, Core Concepts,
// Mock Interviews). Accepts a score payload, awards granular XP per the
// production gamification rules, and appends to the rolling analytics history.
//
// XP Rules:
//   dsa-arena      → 2 XP per solved problem card, max 10 XP
//   core-concepts  → proportional, max 5 XP  (minor reference module)
//   mock-interviews → handled separately in interviewController.js
// ─────────────────────────────────────────────────────────────────────────────

export const submitAssessment = async (req, res, next) => {
  try {
    const {
      module,           // e.g. "aptitude-lab" | "dsa-arena" | "core-concepts" | "mock-interviews"
      score,            // raw correct-answer count (integer)
      total,            // max possible score (integer)
      weakTopics,       // string[] — topic labels the user struggled with
      milestoneContext, // optional — milestone title this session came from
    } = req.body;

    if (typeof score !== "number" || typeof total !== "number" || total === 0) {
      return res.status(400).json({ success: false, message: "Invalid score payload." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const percentage = Math.round((score / total) * 100);

    // ── Per-module granular XP caps ───────────────────────────────────────────
    let xpEarned;
    if (module === "dsa-arena" || module === "dsa_arena") {
      // 2 XP per solved card (score = number of cards solved), max 10 XP
      xpEarned = calcDSAXP(score);
    } else {
      // Fallback for core-concepts / any other module: proportional, max 5 XP
      xpEarned = Math.min(5, Math.round((score / total) * 5));
    }

    // ── Apply XP + recalculate level ──────────────────────────────────────────
    awardXP(user, xpEarned);

    // ── Build the analytics history entry ────────────────────────────────────
    const now = new Date().toISOString();
    const historyEntry = {
      module:           module || "unknown",
      score,
      total,
      percentage,
      xpEarned,
      weakTopics:       Array.isArray(weakTopics) ? weakTopics : [],
      milestoneContext: milestoneContext || null,
      date:             now, // needed by 7-day XP velocity chart
      completedAt:      now,
    };

    // ── Read existing feature_data safely ────────────────────────────────────
    const fd = user.feature_data || {};

    // Rolling analytics history (capped at 50 entries)
    const prevHistory = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];
    const nextHistory = [historyEntry, ...prevHistory].slice(0, 50);

    // Per-module best-score tracking
    const scoreMap  = fd.scores || {};
    const moduleKey = (module || "unknown").replace(/-/g, "_");
    const prevBest  = scoreMap[moduleKey]?.bestPercentage ?? 0;
    scoreMap[moduleKey] = {
      bestPercentage: Math.max(prevBest, percentage),
      lastPercentage: percentage,
      attempts:       (scoreMap[moduleKey]?.attempts ?? 0) + 1,
      lastAttemptAt:  now,
    };

    // Weak topic aggregation
    const prevWeak   = Array.isArray(fd.global_weak_topics) ? fd.global_weak_topics : [];
    const mergedWeak = [...new Set([...prevWeak, ...(historyEntry.weakTopics)])].slice(0, 30);

    // ── Persist ───────────────────────────────────────────────────────────────
    user.feature_data = {
      ...fd,
      scores:             scoreMap,
      assessment_history: nextHistory,
      global_weak_topics: mergedWeak,
      ...(module === "aptitude-lab" && {
        aptitude_last_score: score,
        aptitude_total:      total,
        aptitude_xp_earned:  xpEarned,
        aptitude_weak_spots: historyEntry.weakTopics,
        aptitude_completed:  true,
      }),
    };

    user.markModified("feature_data");
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        xpEarned,
        totalXP:      user.totalXP,
        currentLevel: user.currentLevel,
        percentage,
        module,
      },
    });
  } catch (error) {
    next(error);
  }
};
