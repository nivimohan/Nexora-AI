import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Auth Controllers (Register / Login)
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a signed JWT valid for 30 days */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

/** Strip the password field before sending user data to the client */
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  targetRole: user.targetRole,
  onboardingComplete: user.onboardingComplete,
  feature_data: user.feature_data || {},
  // ── Gamification fields — MUST be included so frontend XP displays correctly ──
  totalXP:           user.totalXP      ?? 0,
  currentLevel:      user.currentLevel ?? 1,
  streakDays:        user.streakDays   ?? 0,
  currentStreak:     user.currentStreak ?? 0,
  mockInterviewsDone: user.mockInterviewsDone ?? 0,
});

// ─────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic input guard
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are all required.",
      });
    }

    // Duplicate check
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists. Try logging in.",
      });
    }

    // Create — password hashing is handled by the pre-save hook on the model
    const user = await User.create({ name, email, password });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Explicitly select password (it's excluded by default via `select: false`)
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────
// GET /api/auth/me   (protected — requires valid JWT)
// ─────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    // req.user is attached by the auth middleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
