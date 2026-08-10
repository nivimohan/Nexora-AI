import express from "express";
import { submitAssessment } from "../controllers/assessmentController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Unified Assessment Submission Route
// POST /api/submit-assessment  →  telemetry sink for all practice modules
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post("/", protect, submitAssessment);

export default router;
