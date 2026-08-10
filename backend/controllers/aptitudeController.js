import User from "../models/User.js";
import { callGeminiWithRotation } from "../utils/geminiClient.js";
import { calcAptitudeXP, awardXP } from "../utils/gamification.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 3: Aptitude Lab Controller
// Calls Gemini to generate a 5-question adaptive aptitude test and
// saves score / weak spot telemetry back to MongoDB upon completion.
//
// XP Rule: 1 XP per correct answer, hard cap 5 XP total.
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/aptitude/generate
export const generateAptitudeTest = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.onboardingComplete) {
      return res.status(400).json({
        success: false,
        message: "Complete onboarding before accessing the Aptitude Lab.",
      });
    }

    const target_job = user.targetRole || "Software Engineer";
    const roadmapMilestones = user.feature_data?.roadmap?.milestones || [];
    const { milestoneContext, forceRefresh } = req.body;

    // ── SESSION CACHE CHECK ──────────────────────────────────────────────────
    const cached = user.feature_data?.active_aptitude_test;
    if (
      !forceRefresh &&
      cached &&
      cached.targetRole === target_job &&
      cached.milestoneContext === (milestoneContext || null) &&
      Array.isArray(cached.questions) &&
      cached.questions.length > 0
    ) {
      return res.status(200).json({
        success: true,
        data: { questions: cached.questions, target_job, fromCache: true },
      });
    }

    const roadmapContext = milestoneContext
      ? `This session is specifically focused on the study milestone: "${milestoneContext}". Tailor all questions directly to this topic area.`
      : roadmapMilestones.length > 0
        ? `The candidate is preparing via a roadmap focused on: ${roadmapMilestones.map((m) => m.title).join(", ")}.`
        : "";

    const prompt = `You are an elite institutional examiner. Generate a personalized 5-question aptitude assessment tailored for an aspiring '${target_job}'. 
${roadmapContext}
Focus heavily on quantitative reasoning, logical deduction, and analytical data problems relevant to this role.

Return ONLY a valid JSON array matching this exact schema shape:
[
  {
    "id": 1,
    "question": "Clear, standalone word problem text...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The exact matching string of the correct option",
    "explanation": "A simple, clear step-by-step breakdown explaining why this option is correct in plain words."
  }
]`;

    let questions;
    try {
      const response = await callGeminiWithRotation({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      questions = JSON.parse(response.text);
    } catch (aiError) {
      console.warn("⚠️ Gemini API error in generateAptitudeTest (Quota/Rate Limit fallback):", aiError.message);

      if (cached && Array.isArray(cached.questions) && cached.questions.length > 0) {
        return res.status(200).json({
          success: true,
          data: { questions: cached.questions, target_job, fromCache: true },
        });
      }

      // Standalone rate limit fallback questions
      questions = [
        {
          id: 1,
          question: `Which data structure provides O(1) average time complexity for key lookups in a ${target_job} application?`,
          options: ["Array", "HashMap / Dictionary", "Binary Search Tree", "Linked List"],
          correctAnswer: "HashMap / Dictionary",
          explanation: "HashMaps map keys directly to bucket indices using a hash function, achieving O(1) average lookup.",
        },
        {
          id: 2,
          question: "If a task takes 120 milliseconds in a synchronous pipeline, what is the throughput per second?",
          options: ["5.3 ops/sec", "8.3 ops/sec", "10 ops/sec", "12 ops/sec"],
          correctAnswer: "8.3 ops/sec",
          explanation: "Throughput = 1000ms / 120ms = 8.33 operations per second.",
        },
        {
          id: 3,
          question: "What is the primary benefit of using database indexing on frequently queried columns?",
          options: ["Reduces storage overhead", "Accelerates SELECT query lookup speeds", "Encrypts stored data", "Prevents duplicate rows"],
          correctAnswer: "Accelerates SELECT query lookup speeds",
          explanation: "Indexes build B-tree/Hash lookup structures that avoid full table scans during SELECT queries.",
        },
        {
          id: 4,
          question: "In a team of 5 developers where each member communicates with every other member, how many communication channels exist?",
          options: ["5", "10", "15", "20"],
          correctAnswer: "10",
          explanation: "Channels = N*(N-1)/2 = 5*4/2 = 10 channels.",
        },
        {
          id: 5,
          question: "Which HTTP status code signifies that a resource was successfully created on the server?",
          options: ["200 OK", "201 Created", "204 No Content", "302 Found"],
          correctAnswer: "201 Created",
          explanation: "201 Created explicitly indicates that the POST request fulfilled and created a new resource.",
        },
      ];
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("AI agent returned an invalid questions array.");
    }

    // Persist to user feature_data cache
    user.feature_data = {
      ...(user.feature_data || {}),
      active_aptitude_test: {
        questions,
        targetRole: target_job,
        milestoneContext: milestoneContext || null,
        generatedAt: new Date().toISOString(),
      },
    };
    user.markModified("feature_data");
    await user.save();

    res.status(200).json({ success: true, data: { questions, target_job } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/aptitude/submit
// XP: 1 per correct answer, max 5 XP total.
export const submitAptitudeScore = async (req, res, next) => {
  try {
    const { score, total, weakQuestions } = req.body;

    if (typeof score !== "number" || typeof total !== "number") {
      return res.status(400).json({ success: false, message: "Invalid score payload." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // ── Gamification: 1 XP per correct answer, max 5 XP ─────────────────────
    const xpEarned  = calcAptitudeXP(score);
    awardXP(user, xpEarned); // mutates user.totalXP + user.currentLevel

    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const weakSpots  = Array.isArray(weakQuestions) ? weakQuestions : [];

    // ── Merge into feature_data assessment_history ───────────────────────────
    const fd         = user.feature_data || {};
    const prevHistory = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];
    const now        = new Date().toISOString();
    const historyEntry = {
      module:      "aptitude-lab",
      score,
      total,
      percentage,
      xpEarned,
      date:        now,
      completedAt: now,
    };
    const scoreMap = fd.scores || {};
    const prevBest = scoreMap["aptitude_lab"]?.bestPercentage ?? 0;
    scoreMap["aptitude_lab"] = {
      bestPercentage: Math.max(prevBest, percentage),
      lastPercentage: percentage,
      attempts:       (scoreMap["aptitude_lab"]?.attempts ?? 0) + 1,
      lastAttemptAt:  now,
    };

    user.aptitudeScore = score;
    user.feature_data  = {
      ...fd,
      scores:              scoreMap,
      assessment_history:  [historyEntry, ...prevHistory].slice(0, 50),
      aptitude_last_score: score,
      aptitude_total:      total,
      aptitude_xp_earned:  xpEarned,
      aptitude_weak_spots: weakSpots,
      aptitude_completed:  true,
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
      },
    });
  } catch (error) {
    next(error);
  }
};
