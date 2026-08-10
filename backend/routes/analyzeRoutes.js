import express from "express";
import { analyzeProfile } from "../controllers/analyzeController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Profile Analysis Routing
// POST /api/analyze-profile   → triggers live Gemini analysis (protected)
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post("/", protect, analyzeProfile);

export default router;
