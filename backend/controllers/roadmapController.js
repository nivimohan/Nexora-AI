console.log("🔥 NEW ROADMAP CONTROLLER LOADED");
import User from "../models/User.js";
import { callGeminiWithRotation } from "../utils/geminiClient.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 2 Roadmap Controller
// Calls Gemini API to generate an adaptive, milestone-driven preparation roadmap.
// ─────────────────────────────────────────────────────────────────────────────

export const getRoadmap = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Guard: profile analysis must be completed first
    if (!user.feature_data?.analysisCompleted) {
      return res.status(400).json({
        success: false,
        message: "Profile analysis must be completed before generating a personalized roadmap.",
      });
    }

    // Return cached roadmap if present to save API tokens and reduce latency.
    // Pass ?refresh=1 to bypass the cache (e.g. after a milestone completion).
    const forceRefresh = req.query.refresh === "1";
    if (!forceRefresh && user.feature_data?.roadmap) {
      return res.status(200).json({
        success: true,
        data: user.feature_data.roadmap,
      });
    }

    const target_job = user.targetRole || "Software Engineer";
    const missing_skills = user.feature_data.resume_missing_keywords || [];

const prompt = `You are an expert career coach.

Evaluate the candidate's profile for the target job: '${target_job}'.

Missing skills:
${missing_skills.join(", ") || "None highlighted"}

First, calculate a realistic match percentage between 0 and 100.

Then create a personalized learning roadmap with exactly 3 or 4 milestones.

IMPORTANT RULES:

- Use very simple English.
- Write as if explaining to a college student.
- Avoid technical jargon whenever possible.
- Keep each title short (4-7 words).
- Keep each description to 1 or 2 short sentences.
- Tell the user what to learn, not why recruiters want it.
- Make every milestone easy to understand.

Return ONLY valid JSON.

Structure:

{
  "matchPercentage": 64,
  "milestones":[
    {
      "id":1,
      "title":"Learn Machine Learning Basics",
      "description":"Understand the basics of machine learning and practice using TensorFlow or PyTorch with small projects.",
      "status":"In Progress",
      "targetModule":"aptitude-lab"
    }
  ]
}`;

    // Call gemini-2.5-flash with key rotation
    const response = await callGeminiWithRotation({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;
    
    // Parse response
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
      console.log("BEFORE MAPPING");
console.log(JSON.stringify(parsedData, null, 2));
    } catch (parseError) {
      console.error("Gemini roadmap output parsing failed. Response text:", responseText);
      throw new Error("Failed to generate valid roadmap structure from AI agent");
    }
    // Force module mapping
parsedData.milestones = parsedData.milestones.map((milestone, index) => ({
  ...milestone,

  status:
    index === 0
      ? "In Progress"
      : "Locked",

  targetModule:
    index === 0
      ? "aptitude-lab"
      : index === 1
      ? "core-concepts"
      : index === 2
      ? "dsa-arena"
      : "mock-interviews",
}));
console.log("AFTER MAPPING");
console.log(JSON.stringify(parsedData, null, 2));
    // Cache the dynamic roadmap into the user document in MongoDB
    user.feature_data = {
      ...user.feature_data,
      roadmap: parsedData,
    };
    console.log("Saving roadmap...");
console.log(parsedData);
    user.markModified("feature_data");
    console.log("Saving user:", user.email);
console.log("User ID:", user._id.toString());
    await user.save();
    console.log("Roadmap saved.");

    res.status(200).json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    next(error);
  }
};
