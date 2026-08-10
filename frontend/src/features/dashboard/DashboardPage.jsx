import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  LayoutDashboard,
  FileSearch,
  Code2,
  BookOpen,
  Mic2,
  BarChart3,
  Map,
  TrendingUp,
  Flame,
  Zap,
  LogOut,
  ChevronRight,
  Lock,
  Award,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import DashboardHome        from "./DashboardHome";
import ResumeAnalyzerPage   from "./ResumeAnalyzerPage";
import RoadmapPage          from "./RoadmapPage";
import AptitudeTrainerPage  from "./AptitudeTrainerPage";
import DSAArenaPage         from "./DSAArenaPage";
import CoreConceptsPage     from "./CoreConceptsPage";
import MockInterviewsPage   from "./MockInterviewsPage";
import DailyChallengePage   from "./DailyChallengePage";
import LeaderboardPage      from "./LeaderboardPage";
import CareerAnalyticsHub   from "./CareerAnalyticsHub";



// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// ── Sidebar nav item ──────────────────────────────────────────────────────────
function NavItem({ item, isActive, onClick }) {
  const Icon = item.icon;

  return (
    <motion.button
      onClick={item.available ? onClick : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                  transition-all duration-200 group relative
                  ${isActive
                    ? "bg-rose/12 border border-rose/25 text-rose"
                    : item.available
                    ? "text-white/55 hover:text-white/90 hover:bg-white/[0.04] border border-transparent"
                    : "text-white/25 cursor-not-allowed border border-transparent"
                  }`}
      whileHover={item.available && !isActive ? { x: 2 } : {}}
      transition={{ duration: 0.15 }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-rose rounded-full"
          layoutId="activeBar"
        />
      )}

      <Icon size={16} className="flex-shrink-0" />
      <span className="text-[13px] font-sans font-medium flex-1 truncate">
        {item.label}
      </span>

      {/* Coming-soon lock */}
      {!item.available && (
        <Lock size={11} className="flex-shrink-0 opacity-50" />
      )}
      {/* Active chevron */}
      {isActive && (
        <ChevronRight size={13} className="flex-shrink-0 opacity-60" />
      )}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD LAYOUT & VIEW CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();

  // activeView is { id: string, context: string | null }
  // context carries optional milestone topic for AI calibration
  const [activeView, setActiveViewRaw] = useState({ id: "home", context: null });

  // Convenience wrapper: accept either a plain string or { id, context } object
  const setActiveView = (viewArg) => {
    if (typeof viewArg === "string") {
      setActiveViewRaw({ id: viewArg, context: null });
    } else {
      setActiveViewRaw({ id: viewArg.id, context: viewArg.context ?? null });
    }
  };

  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem("nexora_user") || "{}");
  });

  const targetRole = user?.targetRole || "Role not set";

  // Shared package and state retention states
  const [workspacePackage, setWorkspacePackage] = useState(null);
  const [dsaState, setDsaState] = useState(null);
  const [conceptsState, setConceptsState] = useState(null);

  // ── Aptitude Lab: full session object that locks on results ─────────────────
  // Shape: { view, questions, targetJob, currentIdx, answers, results, expanded, isCompleted }
  // When isCompleted=true the page renders the Review screen directly on re-entry.
  const [aptitudeSession, setAptitudeSession] = useState(null);

  // ── Mock Interview: full session object that locks on evaluation ────────────
  // Shape: { view, questions, currentIdx, fillerCounts, totalFillers,
  //          stutterCount, confidencePenaltyCount, sessionFillerStats,
  //          sessionTotalFillers, sessionStutters, sessionConfidencePenalty,
  //          sessionTranscripts, xpResult, isCompleted }
  // When isCompleted=true the page renders the Evaluation screen directly on re-entry.
  const [interviewSession, setInterviewSession] = useState(null);

  // Clear all session caches on targetRole changes to force fresh generation
  useEffect(() => {
    setWorkspacePackage(null);
    setDsaState(null);
    setConceptsState(null);
    setAptitudeSession(null);
    setInterviewSession(null);
  }, [user?.targetRole]);

  // Sync latest user profile from MongoDB on dashboard mount.
  // Fires once on entry — downstream views (Leaderboard, etc.) fetch their own
  // data independently, so we avoid racing by not re-firing on every tab switch.
  useEffect(() => {
    api.get("/auth/me")
      .then((response) => {
        if (response.data?.success && response.data?.user) {
          const freshUser = response.data.user;
          setUser(freshUser);
          localStorage.setItem("nexora_user", JSON.stringify(freshUser));
        }
      })
      .catch((err) => {
        console.error("Error fetching latest user session:", err);
      });
  }, []); // ← mount only

  const isUnlocked = user?.feature_data?.analysisCompleted || false;

  // Normalised view id for comparisons and nav highlighting
  const viewId = activeView.id;

  const NAV = [
    {
      section: "OVERVIEW",
      items: [
        { id: "home",            label: "Command Centre",      icon: LayoutDashboard, available: true  },
        { id: "resume-analyzer", label: "Resume Analyzer",     icon: FileSearch,      available: true  },
      ],
    },
    {
      section: "PRACTICE",
      items: [
        { id: "dsa-arena",       label: "DSA Arena",           icon: Code2,           available: isUnlocked },
        { id: "core-concepts",   label: "Core Concepts",        icon: BookOpen,        available: isUnlocked },
        { id: "mock-interviews", label: "Mock Interviews",      icon: Mic2,            available: isUnlocked },
        { id: "aptitude-lab",    label: "Aptitude Lab",         icon: BarChart3,       available: isUnlocked },
      ],
    },
    {
      section: "TRACK",
      items: [
        { id: "daily-challenge",  label: "Daily Challenge",     icon: Flame,       available: isUnlocked },
        { id: "analytics-hub",    label: "My Progress Hub",     icon: TrendingUp,  available: isUnlocked },
        { id: "leaderboard",      label: "Leaderboard",         icon: Award,       available: isUnlocked },
        { id: "roadmap",          label: "TutorTree",           icon: Map,         available: isUnlocked },
      ],
    },
  ];

  function handleLogout() {
    localStorage.removeItem("nexora_token");
    localStorage.removeItem("nexora_user");
    setActiveViewRaw({ id: "home", context: null });
    navigate("/");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#363062" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — fixed width, dark glassmorphic
          ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col overflow-hidden z-20"
        style={{
          background: "rgba(20, 18, 46, 0.97)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose/10 border border-rose/30
                            flex items-center justify-center flex-shrink-0">
              <BrainCircuit size={15} className="text-rose" />
            </div>
            <span className="font-display font-bold text-white text-base tracking-tight">
              nexora<span className="text-rose">.</span>
            </span>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[9px] text-white/35 uppercase tracking-widest font-sans mb-1">
            Calibrated for
          </p>
          <p className="text-rose text-[13px] font-display font-semibold truncate">
            {targetRole}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV.map((section) => (
            <div key={section.section}>
              <p className="text-[9px] text-white/25 uppercase tracking-widest
                            font-sans px-3 mb-1.5">
                {section.section}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={viewId === item.id}
                    onClick={() => setActiveView(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile + logout */}
        <div
          className="px-4 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* XP / streak pills — read live from user state */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-1.5
                             bg-rose/10 border border-rose/20 rounded-full
                             text-[10px] font-semibold text-rose">
              <Zap size={9} /> Lvl {user?.currentLevel ?? 1}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1.5
                             bg-amber-500/10 border border-amber-400/20 rounded-full
                             text-[10px] font-semibold text-amber-300">
              <Flame size={9} /> {user?.feature_data?.daily_streak_counter ?? 0}d
            </span>
          </div>

          {/* User row */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose/15 border border-rose/30
                            flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-rose">
                {user?.name?.[0]?.toUpperCase() ?? "N"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-semibold font-sans truncate">
                {user?.name ?? "Astronaut"}
              </p>
              <p className="text-white/35 text-[10px] font-sans truncate">
                {user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/25 hover:text-rose transition-colors duration-200 flex-shrink-0"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA — scrollable
          ══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto relative">

        {/* Ambient glow (non-blocking) */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-48 right-0 w-[36rem] h-[36rem] rounded-full
                          bg-nebula/35 blur-[140px]" />
          <div className="absolute bottom-0 left-0 w-[28rem] h-[28rem] rounded-full
                          bg-rose/5 blur-[120px]" />
        </div>

        {/* Feature content (animated swap) */}
        <div className="relative z-10 min-h-full">
          <AnimatePresence mode="wait">
            {viewId === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <DashboardHome setActiveView={setActiveView} user={user} />
              </motion.div>
            )}

            {viewId === "resume-analyzer" && (
              <motion.div
                key="resume-analyzer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <ResumeAnalyzerPage setActiveView={setActiveView} />
              </motion.div>
            )}

            {viewId === "roadmap" && (
              <motion.div
                key="roadmap"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <RoadmapPage setActiveView={setActiveView} />
              </motion.div>
            )}

            {viewId === "aptitude-lab" && (
              <motion.div
                key="aptitude-lab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <AptitudeTrainerPage
                  setActiveView={setActiveView}
                  milestoneContext={activeView.context}
                  workspacePackage={workspacePackage}
                  setWorkspacePackage={setWorkspacePackage}
                  aptitudeSession={aptitudeSession}
                  setAptitudeSession={setAptitudeSession}
                />
              </motion.div>
            )}

            {viewId === "dsa-arena" && (
              <motion.div
                key="dsa-arena"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <DSAArenaPage
                  setActiveView={setActiveView}
                  milestoneContext={activeView.context}
                  workspacePackage={workspacePackage}
                  setWorkspacePackage={setWorkspacePackage}
                  dsaState={dsaState}
                  setDsaState={setDsaState}
                />
              </motion.div>
            )}

            {viewId === "core-concepts" && (
              <motion.div
                key="core-concepts"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <CoreConceptsPage
                  setActiveView={setActiveView}
                  milestoneContext={activeView.context}
                  workspacePackage={workspacePackage}
                  setWorkspacePackage={setWorkspacePackage}
                  conceptsState={conceptsState}
                  setConceptsState={setConceptsState}
                />
              </motion.div>
            )}

            {viewId === "mock-interviews" && (
              <motion.div
                key="mock-interviews"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <MockInterviewsPage
                  setActiveView={setActiveView}
                  milestoneContext={activeView.context}
                  interviewSession={interviewSession}
                  setInterviewSession={setInterviewSession}
                  setUser={setUser}
                />
              </motion.div>
            )}

            {viewId === "analytics-hub" && (
              <motion.div
                key="analytics-hub"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <CareerAnalyticsHub setUser={setUser} user={user} setActiveView={setActiveView} />
              </motion.div>
            )}

            {viewId === "daily-challenge" && (
              <motion.div
                key="daily-challenge"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <DailyChallengePage setActiveView={setActiveView} setUser={setUser} />
              </motion.div>
            )}

            {viewId === "leaderboard" && (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                exit={{    opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <LeaderboardPage user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
