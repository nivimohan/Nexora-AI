import express from "express";
import {
  generateDailyChallenge,
  submitDailyChallenge,
} from "../controllers/dailyChallengeController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 6: Daily Placement Challenge Routes
//
// POST /api/daily-challenge/generate  →  fetch 4-task bundle (demo | live | cache)
// POST /api/daily-challenge/submit    →  award +30 XP, increment streak counter
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post("/generate", protect, generateDailyChallenge);
router.post("/submit",   protect, submitDailyChallenge);

export default router;
