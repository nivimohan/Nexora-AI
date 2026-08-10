import express from "express";
import {
  generateAptitudeTest,
  submitAptitudeScore,
} from "../controllers/aptitudeController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Aptitude Lab Routing
// POST /api/aptitude/generate  →  generate 5-question AI test (protected)
// PATCH /api/aptitude/submit   →  record score & award XP (protected)
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post("/generate", protect, generateAptitudeTest);
router.patch("/submit",  protect, submitAptitudeScore);

export default router;
