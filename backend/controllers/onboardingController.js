import User from "../models/User.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Onboarding Controller
// POST /api/onboarding
// Requires: protect middleware (JWT) — req.user.id is set by authMiddleware
// ─────────────────────────────────────────────────────────────────────────────

export const completeOnboarding = async (req, res) => {
  try {
    const { target_job, resume_text } = req.body;

    if (!target_job || !target_job.trim()) {
      return res.status(400).json({
        success: false,
        message: "target_job is required.",
      });
    }

    // ── Fetch current user to check existing XP ───────────────────────────────
    // Never overwrite earned gamification progress for returning users.
    const existing = await User.findById(req.user.id).select("totalXP currentLevel streakDays currentStreak onboardingComplete");

    // Build safe update: always update targetRole and onboardingComplete,
    // but only initialise gamification baseline fields if this is a fresh account.
    const isReturning = existing?.onboardingComplete === true || (existing?.totalXP ?? 0) > 0;

    const updateFields = {
      targetRole:         target_job.trim(),
      resumeUrl:          resume_text || "",
      onboardingComplete: true,
    };

    // Only write baseline gamification fields for brand-new users
    if (!isReturning) {
      updateFields.currentLevel  = 1;
      updateFields.totalXP       = 0;
      updateFields.streakDays    = 1;
      updateFields.currentStreak = 1;
    }

    // Find user and apply baseline metrics
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    console.log(
      `\x1b[35m[NEXORA]\x1b[0m ✅ Onboarding complete for ${updatedUser.email} → role: "${target_job}"`
    );

    res.status(200).json({
      success: true,
      message: "Onboarding complete. Trajectory calibrated.",
      user: {
        id:                 updatedUser._id,
        name:               updatedUser.name,
        email:              updatedUser.email,
        targetRole:         updatedUser.targetRole,
        onboardingComplete: updatedUser.onboardingComplete,
        currentLevel:       updatedUser.currentLevel,
        totalXP:            updatedUser.totalXP,
        streakDays:         updatedUser.streakDays,
      },
    });
  } catch (err) {
    console.error("\x1b[31m[ERROR]\x1b[0m Onboarding:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
