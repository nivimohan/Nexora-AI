import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — User Model
// Master user document. Everything (role, roadmap, quiz attempts) hangs
// off this single record, keeping the nested document structure intact.
// ─────────────────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },

    // ── Onboarding fields (filled in Phase 2) ──
    targetRole: { type: String, default: "" },
    targetCompany: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },
    onboardingComplete: { type: Boolean, default: false },
    feature_data: { type: Object, default: {} },

    // ── Progress snapshot ──
    dsaScore:          { type: Number, default: 0 },
    aptitudeScore:     { type: Number, default: 0 },
    mockInterviewsDone:{ type: Number, default: 0 },
    currentStreak:     { type: Number, default: 0 },

    // ── Gamification baseline (set on onboarding completion) ──
    currentLevel:  { type: Number, default: 0 },
    totalXP:       { type: Number, default: 0 },
    streakDays:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Hash password before every save (only when modified) ──
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare plain text vs hashed ──
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
