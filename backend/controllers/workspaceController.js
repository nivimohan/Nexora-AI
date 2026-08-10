import { dataScientistDemo } from "../demo/datascientistDemo.js";
import User from "../models/User.js";
import { callGeminiWithRotation } from "../utils/geminiClient.js";
import { GoogleGenAI } from "@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Workspace Package Generator Controller
// ─────────────────────────────────────────────────────────────────────────────

// Shared Gemini client factory
function getAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// ── Safe JSON extractor: strips markdown fences Gemini sometimes adds ─────────
function extractJSON(raw) {
  if (!raw) throw new Error("Empty response from AI.");
  // Remove ```json ... ``` or ``` ... ``` wrappers
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(stripped);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. GENERATE WORKSPACE PACKAGE
// ════════════════════════════════════════════════════════════════════════════
export const generateWorkspacePackage = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.onboardingComplete) {
      return res.status(400).json({
        success: false,
        message: "Complete onboarding before accessing the workspace.",
      });
    }

    const target_job      = user.targetRole || "Software Engineer";
    const missingSkills   = user.feature_data?.resume_missing_keywords || [];
    const milestoneContext = req.body?.milestoneContext || null;
    const forceRefresh    = req.body?.forceRefresh === true;
    const demoMode = req.body?.demoMode === true;
    if (demoMode) {
  return res.status(200).json({
    success: true,
    data: {
      ...dataScientistDemo,
      target_job,
      milestoneContext,
      fromDemo: true,
    },
  });
}

    // ── Serve from cache if the role hasn't changed and forceRefresh not set ──
    const cached = user.feature_data?.active_package;
    if (!forceRefresh && cached && cached.targetRole === target_job) {
      return res.status(200).json({
        success: true,
        data: {
          aptitudeQuestions:  cached.aptitudeQuestions,
          dsaArenaProblems:   cached.dsaArenaProblems,
          coreConceptsGuide:  cached.coreConceptsGuide,
          target_job,
          milestoneContext:   cached.milestoneContext,
          fromCache:          true,
        },
      });
    }
    // Demo Mode
if (demoMode) {

  return res.status(200).json({
    success: true,
    data: {
      ...dataScientistDemo,
      target_job,
      milestoneContext,
      fromDemo: true,
    },
  });

}
    const focusLine = milestoneContext
      ? `This package is specifically focused on the study milestone: "${milestoneContext}".`
      : missingSkills.length > 0
        ? `The candidate's primary skill gaps are: ${missingSkills.slice(0, 8).join(", ")}.`
        : "";

    const prompt = `You are an expert technical interviewer. Generate a comprehensive, role-calibrated preparation package for an aspiring '${target_job}'.
${focusLine}

Return ONLY a valid JSON object matching this exact schema:
{
  "aptitudeQuestions": [
    {
      "id": 1,
      "question": "Math/logic question context...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "Exact string answer matches choice",
      "explanation": "Simple step-by-step math proof."
    }
  ],
  "dsaArenaProblems": [
    {
      "id": 1,
      "problemTitle": "Problem Title calibrated to role context",
      "description": "Code syntax task details",
      "inputFormat": "Explanation of input data arrays",
      "expectedOutput": "Expected structure description"
    }
  ],
  "coreConceptsGuide": {
    "topicTitle": "Core Subject Name (e.g., Statistical Modeling or Web Architecture)",
    "studyBullets": [
      "Key Concept 1: Simply explained study guide point.",
      "Key Concept 2: Simply explained study guide point."
    ]
  }
}

Rules:
- aptitudeQuestions: exactly 5 items
- dsaArenaProblems: exactly 5 items
- coreConceptsGuide.studyBullets: 4 to 6 bullet points
- All content must be directly relevant to the target role
- Return ONLY the JSON — no markdown fences, no commentary`;

    const response = await callGeminiWithRotation({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    let pkg;
    try {
      console.log("========== GEMINI RESPONSE ==========");
console.log(response.text);
console.log("========== END ==========");

pkg = extractJSON(response.text);
    } catch (parseErr) {
      console.error("Workspace package parse error. Raw:", response.text?.slice(0, 400));
      throw new Error("AI agent returned an invalid JSON workspace package.");
    }

    // Basic structural validation
    if (
      !Array.isArray(pkg.aptitudeQuestions) ||
      !Array.isArray(pkg.dsaArenaProblems)  ||
      typeof pkg.coreConceptsGuide !== "object"
    ) {
      throw new Error("AI workspace package is missing required fields.");
    }

    // Persist under active_package so the frontend can read it without re-generating
    user.feature_data = {
      ...(user.feature_data || {}),
      active_package: {
        ...pkg,
        generatedAt:      new Date().toISOString(),
        milestoneContext: milestoneContext || null,
        targetRole:       target_job,
      },
    };
    user.markModified("feature_data");
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        ...pkg,
        target_job,
        milestoneContext,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 2. SUBMIT TRAINING SESSION
// ════════════════════════════════════════════════════════════════════════════
export const submitTrainingSession = async (req, res, next) => {
  try {
    const {
      correctAnswers,   // integer — number of correct answers out of 5
      total = 5,        // default to 5-question sessions
      module,           // e.g. "workspace" | "aptitude-lab" | "dsa-arena"
      weakTopics,       // string[] — questions/topics the user got wrong
      milestoneContext, // optional — roadmap milestone this session came from
    } = req.body;

    if (typeof correctAnswers !== "number" || correctAnswers < 0 || correctAnswers > total) {
      return res.status(400).json({ success: false, message: "Invalid correctAnswers payload." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const percentage = Math.round((correctAnswers / total) * 100);

    // XP formula: max 30 XP for daily challenge completion, max 20 XP for other training sets
    const maxXP = (module === "daily-challenge") ? 30 : 20;
    const xpEarned   = Math.round((correctAnswers / total) * maxXP);

    // ── Build history entry ───────────────────────────────────────────────────
    const historyEntry = {
      module:           module || "workspace",
      correctAnswers,
      total,
      percentage,
      xpEarned,
      weakTopics:       Array.isArray(weakTopics) ? weakTopics : [],
      milestoneContext: milestoneContext || null,
      completedAt:      new Date().toISOString(),
    };

    const fd = user.feature_data || {};

    // Rolling scores history array (capped at 50)
    const prevHistory = Array.isArray(fd.scores_history) ? fd.scores_history : [];
    const nextHistory = [historyEntry, ...prevHistory].slice(0, 50);

    // Per-module best-score map (consistent with assessmentController format)
    const scoreMap  = fd.scores || {};
    const moduleKey = (module || "workspace").replace(/-/g, "_");
    const prevBest  = scoreMap[moduleKey]?.bestPercentage ?? 0;
    scoreMap[moduleKey] = {
      bestPercentage: Math.max(prevBest, percentage),
      lastPercentage: percentage,
      attempts:       (scoreMap[moduleKey]?.attempts ?? 0) + 1,
      lastAttemptAt:  historyEntry.completedAt,
    };

    // Global weak topic aggregation (deduped, capped at 30)
    const prevWeak   = Array.isArray(fd.global_weak_topics) ? fd.global_weak_topics : [];
    const mergedWeak = [...new Set([...prevWeak, ...(historyEntry.weakTopics)])].slice(0, 30);

    // ── Persist ───────────────────────────────────────────────────────────────
    user.totalXP      = (user.totalXP || 0) + xpEarned;
    user.feature_data = {
      ...fd,
      scores:               scoreMap,
      scores_history:       nextHistory,
      global_weak_topics:   mergedWeak,
      daily_challenge_done: true,   // Feature 6 Tracker flag
    };

    user.markModified("feature_data");
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        xpEarned,
        totalXP:     user.totalXP,
        percentage,
        module:      module || "workspace",
      },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 3. COMPLETE MILESTONE
// POST /api/complete-milestone
// Awards +100 XP, advances the roadmap milestone chain in MongoDB.
// ════════════════════════════════════════════════════════════════════════════
export const completeMilestone = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    console.log("COMPLETE MILESTONE USER");
console.log(user.email);
console.log(user._id.toString());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const fd       = user.feature_data || {};
    const roadmap  = fd.roadmap;
    console.log("========== COMPLETE MILESTONE ==========");
    console.log("Roadmap:");
    console.log(JSON.stringify(roadmap, null, 2));

    if (!roadmap || !Array.isArray(roadmap.milestones)) {
      return res.status(400).json({
        success: false,
        message: "No active roadmap found. Generate a roadmap first.",
      });
    }

    // ── Advance milestone statuses ────────────────────────────────────────────
    const milestones   = [...roadmap.milestones];
    const inProgressIdx = milestones.findIndex((m) => m.status === "In Progress");
    console.log("In Progress Index:", inProgressIdx);

console.log(
  milestones.map(m => ({
    title: m.title,
    status: m.status
  }))
);

    if (inProgressIdx === -1) {
      return res.status(400).json({
        success: false,
        message: "No active 'In Progress' milestone to complete.",
      });
    }

    // Mark current milestone as Completed
    milestones[inProgressIdx] = {
      ...milestones[inProgressIdx],
      status: "Completed",
    };

    // Unlock the next Locked milestone
    const nextLockedIdx = milestones.findIndex(
      (m, i) => i > inProgressIdx && m.status === "Locked"
    );
    if (nextLockedIdx !== -1) {
      milestones[nextLockedIdx] = {
        ...milestones[nextLockedIdx],
        status: "In Progress",
      };
    }

    // ── Update roadmap + award XP ─────────────────────────────────────────────
    const XP_MILESTONE = 20;
    const updatedRoadmap = { ...roadmap, milestones };

    user.totalXP      = (user.totalXP || 0) + XP_MILESTONE;
    user.feature_data = {
      ...fd,
      roadmap: updatedRoadmap,
    };
    user.markModified("feature_data");
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        xpEarned:        XP_MILESTONE,
        totalXP:         user.totalXP,
        updatedRoadmap,
        allCompleted:    nextLockedIdx === -1,
      },
    });
  } catch (error) {
    console.error(error);
next(error);
  }
};
