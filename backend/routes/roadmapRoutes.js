import express from "express";
import { getRoadmap } from "../controllers/roadmapController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Roadmap Routing
// GET /api/roadmap   → returns live Gemini-powered roadmap (protected)
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.get("/", protect, getRoadmap);

export default router;
