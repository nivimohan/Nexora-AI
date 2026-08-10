import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import onboardingRoutes from "./routes/onboardingRoutes.js";
import analyzeRoutes from "./routes/analyzeRoutes.js";
import roadmapRoutes from "./routes/roadmapRoutes.js";
import aptitudeRoutes    from "./routes/aptitudeRoutes.js";
import assessmentRoutes  from "./routes/assessmentRoutes.js";
import workspaceRoutes   from "./routes/workspaceRoutes.js";
import interviewRoutes   from "./routes/interviewRoutes.js";
import dailyChallengeRoutes from "./routes/dailyChallengeRoutes.js";
import leaderboardRoutes    from "./routes/leaderboardRoutes.js";


// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Express Server Entry Point
// ─────────────────────────────────────────────────────────────────────────────

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────
// Middleware Stack
// ─────────────────────────────────────────

// CORS — allow requests from the Vite frontend
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Parse incoming JSON bodies
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (dev mode: colourized output)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─────────────────────────────────────────
// API Routes  (will be expanded in next steps)
// ─────────────────────────────────────────

// Health-check route — confirms the server & DB are alive
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Nexora AI server is live",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Auth routes — live
app.use("/api/auth",       authRoutes);
// Onboarding route — live
app.use("/api/onboarding", onboardingRoutes);
// Profile Analysis route — live
app.use("/api/analyze-profile", analyzeRoutes);
// Adaptive Roadmap route — live
app.use("/api/roadmap", roadmapRoutes);
// Aptitude Lab route — live
app.use("/api/aptitude", aptitudeRoutes);
// Unified assessment telemetry sink — live
app.use("/api/submit-assessment", assessmentRoutes);
// Workspace package generator — live
app.use("/api", workspaceRoutes);
// Mock Interview Engine — live
app.use("/api/interview",        interviewRoutes);
// Daily Placement Challenge — live
app.use("/api/daily-challenge",  dailyChallengeRoutes);
// Campus Leaderboard — live
app.use("/api/leaderboard",       leaderboardRoutes);


// Placeholder route stubs — wired in upcoming steps
// app.use("/api/users",     userRoutes);
// app.use("/api/roles",     roleRoutes);
// app.use("/api/roadmap",   roadmapRoutes);
// app.use("/api/quiz",      quizRoutes);
// app.use("/api/challenges",challengeRoutes);
// app.use("/api/analytics", analyticsRoutes);

// ─────────────────────────────────────────
// 404 Handler — catch-all for unknown routes
// ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`\x1b[31m[ERROR]\x1b[0m ${err.stack}`);
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(
    `\x1b[35m[NEXORA]\x1b[0m 🌌 Server running on \x1b[36mhttp://localhost:${PORT}\x1b[0m in \x1b[33m${process.env.NODE_ENV}\x1b[0m mode`
  );
});

export default app;
