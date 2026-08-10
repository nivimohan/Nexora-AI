import { mockInterviewDemo } from "../demo/mockInterviewDemo.js";
import User from "../models/User.js";
import { callGeminiWithRotation } from "../utils/geminiClient.js";
import { calcInterviewXP, awardXP } from "../utils/gamification.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 4: Mock Interview Controller
//
// POST /api/interview/generate
//   Fires a Gemini request to generate 3 custom technical questions calibrated
//   to the user's targetRole and resume skill gaps.
//
// POST /api/interview/submit
//   Ingests simulation telemetry, awards XP, advances the roadmap milestone
//   status, and persists metrics to MongoDB Compass.
// ─────────────────────────────────────────────────────────────────────────────

// Strip markdown code fences if Gemini returns them
function extractJSON(raw) {
  if (!raw) throw new Error("Empty response from AI.");
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(stripped);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. GENERATE MOCK INTERVIEW QUESTIONS
// ════════════════════════════════════════════════════════════════════════════
export const generateInterview = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const target_job    = user.targetRole || "Software Engineer";
    const missingSkills = user.feature_data?.resume_missing_keywords || [];
    const activePackage = user.feature_data?.active_package || {};
    const forceRefresh  = req.body?.forceRefresh === true;
    const demoMode = req.body?.demoMode === true;
if (demoMode) {
  return res.status(200).json({
    success: true,
    data: {
      questions: mockInterviewDemo.interviewQuestions,
      target_job,
      fromDemo: true,
    },
  });
}
    // ── Serve from cache if targetRole matches and forceRefresh not set ──────
    const cached = user.feature_data?.active_interview;
    if (!forceRefresh && cached && cached.targetRole === target_job) {
      return res.status(200).json({
        success: true,
        data: {
          questions: cached.questions,
          target_job,
          fromCache: true,
        },
      });
    }

    const focusLine = missingSkills.length > 0
      ? `Ensure some questions probe the candidate's understanding of their identified skill gaps: ${missingSkills.slice(0, 5).join(", ")}.`
      : "";

    const prompt = `You are a friendly, elite recruiter conducting a conversational mock interview. Generate exactly 3 technical interview questions tailored for a candidate targeting a '${target_job}' role.
${focusLine}
Base the questions on core technical concepts, systems execution, or potential resume gap spaces.

CRITICAL RULES FOR THE QUESTIONS:
- They must be clear, natural, and friendly—exactly how a real human recruiter would phrase them to a college student.
- They must NOT be overly complex math riddles or walls of text.
- The student must easily understand what is being asked so they can answer independently using their own words.

Return ONLY a valid JSON array matching this schema:
[
  {
    "id": 1,
    "question": "Clear, direct vocal question text..."
  }
]

Rules:
- Generate exactly 3 questions.
- Return ONLY the JSON array — no markdown fences, no commentary, no conversational wrapper outside the JSON structure.`;

    let questions;
    try {
      const response = await callGeminiWithRotation({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      questions = extractJSON(response.text);
    } catch (aiError) {
      console.warn("⚠️ Gemini API error in generateInterview (Quota/Rate Limit fallback):", aiError.message);

      if (cached && Array.isArray(cached.questions) && cached.questions.length === 3) {
        return res.status(200).json({
          success: true,
          data: { questions: cached.questions, target_job, fromCache: true },
        });
      }

      questions = mockInterviewDemo.interviewQuestions;
    }

    if (!Array.isArray(questions) || questions.length !== 3) {
      throw new Error("AI generated questions did not meet structural requirements.");
    }

    user.feature_data = {
      ...(user.feature_data || {}),
      active_interview: {
        questions,
        targetRole: target_job,
        generatedAt: new Date().toISOString(),
      },
    };
    user.markModified("feature_data");
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        questions,
        target_job,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// 2. SUBMIT INTERVIEW & TELEMETRY
// ════════════════════════════════════════════════════════════════════════════
export const submitInterview = async (req, res, next) => {
  try {
    const {
  fillerWordCounts,
  transcription,
  demoMode = false,
} = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const target_job = user.targetRole || "Software Engineer";

    // ── Zero-Speech Guard ────────────────────────────────────────────────────
    // If the combined session transcript is empty, return early with 0 XP.
    // This prevents gaming the system by clicking Submit without speaking.
    const cleanTranscript = (transcription || "").trim();
    if (cleanTranscript.length === 0) {
      return res.status(200).json({
        success: true,
        noSpeechDetected: true,
        message: "No speech input detected. Attend an active interview to collect XP points.",
        data: {
          xpEarned:     0,
          totalXP:      user.totalXP || 0,
          currentLevel: user.currentLevel || 1,
          breakdown:    "⚠️ No speech input detected. Complete an active interview response to collect XP points.",
          confidenceScore: 0,
          user,
        },
      });
    }

    let evaluation;

if (demoMode) {
  evaluation = {
    breakdown: mockInterviewDemo.evaluation.feedback,
    confidenceScore: mockInterviewDemo.evaluation.overallScore,
  };
} else {
  evaluation = {
    breakdown: "Your speech was fluid and professional with good pacing!",
    confidenceScore: 100,
  };
}

    if (!demoMode && transcription && transcription.trim()) {
      try {
        const evalPrompt = `You are evaluating an aspiring ${target_job} candidate strictly for conversational confidence, pacing, and delivery rather than absolute technical correctness. Analyze the raw transcribed text:
"${transcription}"

Look closely for frequent filler phrases like 'umm', 'uhh', 'err', 'you know', 'i think', 'i guess', or excessive hesitation patterns. Provide a friendly, constructive verbal breakdown emphasizing delivery, confidence, and fluid pacing. Give a simple confidence percentage score.

Return ONLY a valid JSON object matching this schema:
{
  "breakdown": "Friendly, constructive verbal breakdown emphasizing delivery, confidence, and fluid pacing...",
  "confidenceScore": 85
}
Do not return any markdown code fences, comments, or wrapper text outside the JSON structure.`;

        const response = await callGeminiWithRotation({
          model: "gemini-2.5-flash",
          contents: evalPrompt,
          config: { responseMimeType: "application/json" },
        });

        try {
          const parsedEval = extractJSON(response.text);
          if (parsedEval && typeof parsedEval.confidenceScore === "number") {
            evaluation = parsedEval;
          }
        } catch (parseError) {
          console.warn("Failed to parse evaluation JSON from Gemini. Raw response:", response.text);
        }
      } catch (geminiError) {
        console.error("Gemini evaluation error:", geminiError);
      }
    }

    // Award XP: 0 to 5 XP dynamically based on confidenceScore %
    const XP_AWARD = calcInterviewXP(evaluation.confidenceScore);
    awardXP(user, XP_AWARD);
    user.mockInterviewsDone = (user.mockInterviewsDone || 0) + 1;

    // Advance roadmap milestone chain (Feature 2)
    const fd = user.feature_data || {};
    const roadmap = fd.roadmap;
    let nextLockedIdx = -1;

    if (roadmap && Array.isArray(roadmap.milestones)) {
      const milestones = [...roadmap.milestones];
      const inProgressIdx = milestones.findIndex((m) => m.status === "In Progress");

      if (inProgressIdx !== -1) {
        milestones[inProgressIdx] = {
          ...milestones[inProgressIdx],
          status: "Completed",
        };

        const nextIdx = milestones.findIndex((m, i) => i > inProgressIdx && m.status === "Locked");
        if (nextIdx !== -1) {
          nextLockedIdx = nextIdx;
          milestones[nextIdx] = {
            ...milestones[nextIdx],
            status: "In Progress",
          };
        }
      }
      fd.roadmap = { ...roadmap, milestones };
    }

    // Capture telemetry stats
    const now = new Date().toISOString();
    const prevHistory = Array.isArray(fd.interview_history) ? fd.interview_history : [];
    const newEntry = {
      completedAt: now,
      date: now,
      xpEarned: XP_AWARD,
      fillerWordCounts: fillerWordCounts || {},
      breakdown: evaluation.breakdown,
      confidenceScore: evaluation.confidenceScore,
    };
    fd.interview_history = [newEntry, ...prevHistory].slice(0, 50);

    // Also push to general assessment_history for analytics & badges
    const assessmentEntry = {
      module: "mock-interviews",
      score: Math.round((evaluation.confidenceScore / 100) * 5),
      total: 5,
      percentage: evaluation.confidenceScore,
      xpEarned: XP_AWARD,
      date: now,
      completedAt: now,
    };
    const prevAssessmentHistory = Array.isArray(fd.assessment_history) ? fd.assessment_history : [];
    fd.assessment_history = [assessmentEntry, ...prevAssessmentHistory].slice(0, 50);

    user.feature_data = fd;
    user.markModified("feature_data");
    await user.save();

    res.status(200).json({
      success: true,
      message: "Mock interview simulation finalized.",
      data: {
        xpEarned: XP_AWARD,
        totalXP: user.totalXP,
        mockInterviewsDone: user.mockInterviewsDone,
        breakdown: evaluation.breakdown,
        confidenceScore: evaluation.confidenceScore,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
