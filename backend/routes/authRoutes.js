import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Auth Routes
// POST /api/auth/register   → create account
// POST /api/auth/login      → get token
// GET  /api/auth/me         → get current user (protected)
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post("/register", register);
router.post("/login",    login);
router.get("/me",        protect, getMe);

export default router;
