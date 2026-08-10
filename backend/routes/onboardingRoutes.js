import express from "express";
import { completeOnboarding } from "../controllers/onboardingController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Onboarding Routes
// POST /api/onboarding   → complete gatekeeper wizard (protected)
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post("/", protect, completeOnboarding);

export default router;
