import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage    from "@/features/landing/LandingPage";
import OnboardingPage from "@/features/onboarding/OnboardingPage";
import DashboardPage  from "@/features/dashboard/DashboardPage";
import OfflineBanner  from "@/features/common/OfflineBanner";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Root Application Router
//   /              → LandingPage    (Phase 1)
//   /onboarding    → OnboardingPage (Phase 3 — The Gatekeeper)
//   /dashboard     → DashboardPage  (Phase 4 — Command Centre shell)
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      {/* Global network status UI — sits above all routes, z-index 9999 */}
      <OfflineBanner />

      <Routes>
        <Route path="/"           element={<LandingPage    />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard"  element={<DashboardPage  />} />

        {/* Routes to be added in upcoming steps */}
        {/* <Route path="/roadmap"     element={<RoadmapPage    />} /> */}
        {/* <Route path="/quiz"        element={<QuizPage       />} /> */}
        {/* <Route path="/challenges"  element={<ChallengesPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
