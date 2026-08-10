import express from "express";
import { getLeaderboard } from "../controllers/leaderboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/leaderboard — requires valid JWT (logged-in user only)
router.get("/", protect, getLeaderboard);

export default router;
