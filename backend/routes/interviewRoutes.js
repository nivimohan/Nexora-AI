import express from "express";
import { generateInterview, submitInterview } from "../controllers/interviewController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 4: Mock Interview Routes
//
// POST /api/interview/generate  →  creates 3 custom role-calibrated questions
// POST /api/interview/submit    →  saves telemetry, awards +150 XP, unlocks roadmap
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post("/generate", protect, generateInterview);
router.post("/submit",   protect, submitInterview);

export default router;
