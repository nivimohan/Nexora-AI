import { dailyChallengeDemo } from "../demo/dailyChallengeDemo.js";
import User from "../models/User.js";
import { callGeminiWithRotation } from "../utils/geminiClient.js";
import { calcDailyChallengeXP, awardXP } from "../utils/gamification.js";

function extractJSON(raw) {
  if (!raw) throw new Error("Empty AI response.");
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(stripped);
}

/** Returns true if the date string is within the last 24 hours */
function isWithin24Hours(isoString) {
  if (!isoString) return false;
  const generated = new Date(isoString);
  const diffMs = Date.now() - generated.getTime();
  return diffMs < 24 * 60 * 60 * 1000; // 24 hours in ms
}

// ════════════════════════════════════════════════════════════════════════════
// 1. GENERATE DAILY CHALLENGE BUNDLE
// ════════════════════════════════════════════════════════════════════════════
export const generateDailyChallenge = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const target_job = user.targetRole || "Software Engineer";
    const demoMode   = req.body?.demoMode === true;
    const forceRefresh = req.body?.forceRefresh === true;

    // ── Demo Mode: return static dataset immediately ──────────────────────────
    if (demoMode) {
      return res.status(200).json({
        success: true,
        data: { ...dailyChallengeDemo, target_job, fromDemo: true },
      });
    }

    // ── Cache hit: serve existing challenge if still within the 24 hr window ─
    const cached = user.feature_data?.active_daily_challenge;
    if (
      !forceRefresh &&
      cached &&
      cached.targetRole === target_job &&
      isWithin24Hours(cached.generatedAt)
    ) {
      return res.status(200).json({
        success: true,
        data: {
          aptitudeTask: cached.aptitudeTask,
          codingTask:   cached.codingTask,
          hrTask:       cached.hrTask,
          verbalTask:   cached.verbalTask,
          target_job,
          fromCache: true,
          challengeCompleted: user.feature_data?.challenge_completed || false,
        },
      });
    }

    // ── Live Mode: call Gemini 2.5 Flash for a fresh role-calibrated bundle ──
    const missingSkills = user.feature_data?.resume_missing_keywords || [];
    const focusLine = missingSkills.length > 0
      ? `The candidate's key skill gaps include: ${missingSkills.slice(0, 5).join(", ")}.`
      : "";

    const prompt = `You are an expert placement coach building a daily practice challenge for a '${target_job}' candidate.
${focusLine}

Generate exactly 4 tasks — one of each type. Return ONLY a valid JSON object matching this exact schema:
{
  "aptitudeTask": {
    "id": "dc-aptitude",
    "type": "aptitude",
    "title": "Short topic title (e.g. 'Probability & Statistics')",
    "question": "A clear, single MCQ aptitude question directly relevant to ${target_job}",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact string matching one of the options",
    "explanation": "A simple 1-2 sentence explanation of why the answer is correct"
  },
  "codingTask": {
    "id": "dc-coding",
    "type": "coding",
    "title": "Short coding challenge title",
    "question": "Clear problem statement with example input/output. Must be solvable in 10-15 minutes.",
    "solutionHint": "1-2 sentence approach hint without giving away the full solution",
    "referenceAnswer": "A clean, minimal code solution in Python or relevant language"
  },
  "hrTask": {
    "id": "dc-hr",
    "type": "hr",
    "title": "HR Behavioral Round",
    "question": "A realistic behavioral/situational HR scenario question relevant to the role",
    "sampleAnswer": "A strong, structured 3-4 sentence sample answer using STAR format"
  },
  "verbalTask": {
    "id": "dc-verbal",
    "type": "verbal",
    "title": "Communication Exercise",
    "prompt": "Explain [a core concept relevant to ${target_job}] to a non-technical stakeholder in 3 simple sentences.",
    "tips": [
      "Tip 1 for structuring the explanation",
      "Tip 2 for clarity",
      "Tip 3 for impact"
    ]
  }
}

Rules:
- All content must be directly relevant to the '${target_job}' role
- The aptitude question must have exactly 4 options with one clearly correct answer
- Coding challenge must be achievable in ~15 minutes
- HR question must be behavioral/situational, not theoretical
- Verbal exercise must focus on explaining a core concept simply
- Return ONLY the JSON — no markdown fences, no commentary`;

    let bundle;
    try {
      const response = await callGeminiWithRotation({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      bundle = extractJSON(response.text);
    } catch (aiError) {
      console.warn("⚠️ Gemini API error in generateDailyChallenge (Quota/Rate Limit fallback):", aiError.message);

      if (cached && cached.aptitudeTask && cached.codingTask) {
        return res.status(200).json({
          success: true,
          data: {
            aptitudeTask: cached.aptitudeTask,
            codingTask:   cached.codingTask,
            hrTask:       cached.hrTask,
            verbalTask:   cached.verbalTask,
            target_job,
            fromCache: true,
            challengeCompleted: user.feature_data?.challenge_completed || false,
          },
        });
      }

      bundle = dailyChallengeDemo;
    }

    // Validate required keys
    const requiredKeys = ["aptitudeTask", "codingTask", "hrTask", "verbalTask"];
    for (const key of requiredKeys) {
      if (!bundle[key]) throw new Error(`AI bundle missing required field: ${key}`);
    }

    // Cache bundle in MongoDB (resets challenge_completed for new day's challenge)
    const fd = user.feature_data || {};
    user.feature_data = {
      ...fd,
      active_daily_challenge: {
        ...bundle,
        generatedAt: new Date().toISOString(),
        targetRole:  target_job,
      },
      challenge_completed: false, // New challenge = not yet claimed
    };
    user.markModified("feature_data");
    await user.save();

    return res.status(200).json({
      success: true,
      data: { ...bundle, target_job, challengeCompleted: false },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 2. SUBMIT DAILY CHALLENGE (STREAK + XP TELEMETRY)
// POST /api/daily-challenge/submit
// ════════════════════════════════════════════════════════════════════════════
export const submitDailyChallenge = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const fd = user.feature_data || {};

    // ── Guard: prevent double-claiming within the 24 hr window ───────────────
    if (fd.challenge_completed === true) {
      return res.status(200).json({
        success: true,
        alreadyClaimed: true,
        message: "Challenge already completed for today. Come back tomorrow for a new challenge!",
        data: {
          totalXP:     user.totalXP || 0,
          currentLevel: user.currentLevel || 1,
          dailyStreak: fd.daily_streak_counter || 0,
        },
      });
    }

    // ── Missed-Day Streak Gate ────────────────────────────────────────────────
    // If the last successful challenge was completed more than 1 calendar day ago
    // (i.e., any day was skipped), the streak resets to 0 before adding today's day.
    const lastCompletedAt = fd.last_challenge_completed_at || null;
    let currentStreak = fd.daily_streak_counter || 0;

    if (lastCompletedAt) {
      const lastDate = new Date(lastCompletedAt);
      const todayDate = new Date();
      // Normalise both to midnight UTC to compare calendar days only
      const lastDay  = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate());
      const todayDay = Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate());
      const daysDiff = Math.round((todayDay - lastDay) / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        // Missed at least one calendar day → hard reset
        console.log(`⚠️ Streak reset: last completion was ${daysDiff} days ago. Resetting from ${currentStreak} → 0.`);
        currentStreak = 0;
      }
    }

    // ── Award XP (flat 10 XP on verified 4/4 completion) ────────────────────
    const XP_DAILY = calcDailyChallengeXP(); // 10 XP
    awardXP(user, XP_DAILY); // mutates user.totalXP and user.currentLevel

    // ── Increment streak counter ──────────────────────────────────────────────
    const newStreak = currentStreak + 1;
    const now = new Date().toISOString();

    // ── Append to assessment_history for 7-day velocity graph ────────────────
    const historyEntry = {
      module:       "daily-challenge",
      score:        4,
      total:        4,
      percentage:   100,
      xpEarned:     XP_DAILY,
      date:         now,
      completedAt:  now,
    };
    const prevHistory = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];
    const nextHistory = [historyEntry, ...prevHistory].slice(0, 50);

    // ── Persist ────────────────────────────────────────────────────────────────
    user.feature_data = {
      ...fd,
      daily_streak_counter:       newStreak,
      challenge_completed:         true,
      last_challenge_completed_at: now,
      assessment_history:          nextHistory,
    };
    // Mirror streak into top-level schema field for convenience
    user.currentStreak = newStreak;
    user.streakDays    = newStreak;
    user.markModified("feature_data");
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        xpEarned:     XP_DAILY,
        totalXP:      user.totalXP,
        currentLevel: user.currentLevel,
        dailyStreak:  newStreak,
        // Full updated user object so frontend can sync localStorage immediately
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
