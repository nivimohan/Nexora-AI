import express from "express";
import {
  generateWorkspacePackage,
  submitTrainingSession,
  completeMilestone,
} from "../controllers/workspaceController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Workspace Package Routes
//
// POST /api/generate-workspace-package  →  one Gemini call, full study bundle
// POST /api/submit-training-session     →  score telemetry + XP + daily flag
// POST /api/complete-milestone          →  awards +100 XP, advances roadmap
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post("/generate-workspace-package", protect, generateWorkspacePackage);
router.post("/submit-training-session",    protect, submitTrainingSession);
router.post("/complete-milestone",         protect, completeMilestone);

export default router;
