import User from "../models/User.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Leaderboard Controller
//
// GET /api/leaderboard
// Returns all registered users sorted by totalXP descending.
// Only exposes safe public fields — never passwords or emails.
// ─────────────────────────────────────────────────────────────────────────────

export const getLeaderboard = async (req, res) => {
  try {
    // Project only the fields safe for public display
    const users = await User.find({})
      .select("name targetRole totalXP currentLevel feature_data.daily_streak_counter")
      .sort({ totalXP: -1 })
      .limit(50) // Cap at top 50 to keep payload small
      .lean();

    const board = users.map((u, idx) => ({
      id:     u._id.toString(),
      name:   u.name        || "Nexora Student",
      role:   u.targetRole  || "Student",
      xp:     u.totalXP     ?? 0,
      level:  u.currentLevel ?? 1,
      streak: u.feature_data?.daily_streak_counter ?? 0,
      avatar: (u.name || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      rank: idx + 1,
    }));

    return res.status(200).json({ success: true, data: board });
  } catch (err) {
    console.error("[Leaderboard] DB error:", err);
    return res.status(500).json({ success: false, message: "Failed to load leaderboard." });
  }
};
