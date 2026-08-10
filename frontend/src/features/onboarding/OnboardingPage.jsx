import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Target,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  ChevronRight,
  Rocket,
  Sparkles,
  Cpu,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Phase 3: The Gatekeeper Onboarding Wizard
// State machine: 'form' → 'processing' → 'success'
// ─────────────────────────────────────────────────────────────────────────────

// ── Popular role suggestions ──────────────────────────────────────────────────
const POPULAR_ROLES = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Analyst",
  "Data Scientist",
  "ML Engineer",
  "DevOps Engineer",
  "Android Developer",
  "Cloud Engineer",
  "Cybersecurity Analyst",
  "Product Manager",
  "iOS Developer",
];

// ── Processing scan messages (one every ~700ms) ───────────────────────────────
const SCAN_MESSAGES = [
  "Scanning baseline metrics...",
  "Mapping skill topology...",
  "Synchronizing career path...",
  "Generating personalized roadmap...",
  "Calibrating AI modules...",
  "Finalizing trajectory...",
];

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/* ── Futuristic scanning animation shown during processing ── */
function ScannerAnimation({ msgIndex }) {
  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Orbital rings */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Outer dashed ring */}
        <motion.div
          className="absolute w-48 h-48 rounded-full"
          style={{
            border: "1px dashed rgba(216,185,195,0.35)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        {/* Outer dot riders (4 dots at 90° intervals on the outer ring) */}
        {[0, 90, 180, 270].map((deg) => (
          <motion.div
            key={deg}
            className="absolute w-2 h-2 rounded-full bg-rose"
            style={{
              top: "50%",
              left: "50%",
              marginTop: -4,
              marginLeft: -4,
              transformOrigin: "4px 96px",
              rotate: `${deg}deg`,
              translateY: "-96px",
              opacity: 0.7,
            }}
            animate={{ rotate: [deg, deg + 360] }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
        ))}

        {/* Mid ring */}
        <motion.div
          className="absolute w-32 h-32 rounded-full"
          style={{ border: "1px solid rgba(130,115,151,0.5)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        />
        {/* Mid dot rider */}
        <motion.div
          className="absolute w-2.5 h-2.5 rounded-full bg-amethyst"
          style={{
            top: "50%",
            left: "50%",
            marginTop: -5,
            marginLeft: -5,
            transformOrigin: "5px 64px",
            translateY: "-64px",
            opacity: 0.9,
          }}
          animate={{ rotate: [0, -360] }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner pulsing glow disc */}
        <motion.div
          className="absolute w-20 h-20 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(216,185,195,0.18) 0%, transparent 70%)",
            border: "1px solid rgba(216,185,195,0.3)",
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Scan line sweeping vertically across inner disc */}
        <motion.div
          className="absolute w-20 h-0.5 rounded-full overflow-hidden"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(216,185,195,0.8), transparent)",
            top: "50%",
            left: "50%",
            marginLeft: -40,
            marginTop: -1,
          }}
          animate={{ y: [-36, 36, -36] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Centre icon */}
        <div className="relative z-10">
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <BrainCircuit size={34} className="text-rose" />
          </motion.div>
        </div>
      </div>

      {/* Cycling scan text */}
      <div className="text-center min-h-[2.5rem] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            className="text-base font-display font-semibold text-rose tracking-wide"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {SCAN_MESSAGES[msgIndex] ?? SCAN_MESSAGES[SCAN_MESSAGES.length - 1]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #827397, #D8B9C3)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3.8, ease: "easeInOut" }}
        />
      </div>

      {/* Dot grid — decorative binary rain feel */}
      <div className="grid grid-cols-8 gap-1.5 opacity-25">
        {Array.from({ length: 32 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amethyst"
            animate={{ opacity: [0.15, 0.9, 0.15] }}
            transition={{
              duration: 1.2 + (i % 4) * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (i * 0.07) % 1.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Animated success checkmark (SVG path draw) ── */
function SuccessCheckmark() {
  return (
    <motion.div
      className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
      style={{
        background:
          "radial-gradient(circle, rgba(216,185,195,0.18) 0%, transparent 70%)",
        border: "1.5px solid rgba(216,185,195,0.4)",
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
    >
      <svg viewBox="0 0 52 52" className="w-14 h-14">
        <motion.circle
          cx="26" cy="26" r="24"
          fill="none"
          stroke="rgba(216,185,195,0.3)"
          strokeWidth="2"
        />
        <motion.path
          d="M 14 26 L 22 34 L 38 18"
          fill="none"
          stroke="#D8B9C3"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();

  // ── State machine ──
  const [phase, setPhase]         = useState("form");      // 'form' | 'processing' | 'success'
  const [targetRole, setTargetRole] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError]           = useState("");
  const [scanMsgIdx, setScanMsgIdx] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fileInputRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("nexora_user") || "{}");

  // ── Returning-user guard ──────────────────────────────────────────────────────
  // If a user who has already completed onboarding navigates here (e.g. browser
  // back button, direct URL entry), redirect them straight to the dashboard so
  // their XP and progress data are never overwritten by the wizard form.
  useEffect(() => {
    if (user?.onboardingComplete === true) {
      navigate("/dashboard", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Cycling scan messages during processing ──────────────────────────────────
  useEffect(() => {
    if (phase !== "processing") return;

    setScanMsgIdx(0);
    const interval = setInterval(() => {
      setScanMsgIdx((prev) =>
        prev < SCAN_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 650);

    // API call runs in background; timer drives the animation
    const timeout = setTimeout(() => {
      setPhase("success");
    }, 4200);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [phase]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!targetRole.trim()) {
      setError("Please enter or select your target role.");
      return;
    }
    setError("");
    setPhase("processing");

    try {
      const { data } = await api.post("/onboarding", {
        target_job:  targetRole.trim(),
        resume_text: resumeFile?.name || "",
      });

      if (data.success) {
        // Update cached user in localStorage
        const existing = JSON.parse(localStorage.getItem("nexora_user") || "{}");
        localStorage.setItem(
          "nexora_user",
          JSON.stringify({ ...existing, ...data.user })
        );
      }
    } catch (err) {
      // Swallow API errors — animation completes regardless (simulated flow)
      console.warn("Onboarding API:", err.response?.data?.message || err.message);
    }
  }

  function handleDragOver(e)  { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave()  { setIsDragging(false); }
  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") setResumeFile(file);
    else setError("Only PDF files are accepted.");
  }
  function handleFileInput(e) {
    const file = e.target.files[0];
    if (file) setResumeFile(file);
  }

  const filteredRoles = POPULAR_ROLES.filter((r) =>
    r.toLowerCase().includes(targetRole.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-plum flex items-center justify-center
                    overflow-hidden px-4 py-12">

      {/* ── Ambient glows ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 -left-48 w-[28rem] h-[28rem] rounded-full
                        bg-nebula/50 blur-[130px]" />
        <div className="absolute -bottom-48 -right-48 w-[32rem] h-[32rem] rounded-full
                        bg-amethyst/25 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-96 h-96 rounded-full bg-rose/5 blur-[100px]" />
      </div>

      {/* ── Header bar ── */}
      <motion.header
        className="absolute top-0 left-0 right-0 flex items-center gap-2.5 px-8 py-5 z-20"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-8 h-8 rounded-lg bg-rose/10 border border-rose/30
                        flex items-center justify-center">
          <BrainCircuit size={15} className="text-rose" />
        </div>
        <span className="font-display font-bold text-white text-base tracking-tight">
          nexora<span className="text-rose">.</span>
        </span>
        <span className="ml-auto text-[11px] text-amethyst/60 font-sans hidden sm:block">
          The Gatekeeper &mdash; Onboarding Wizard
        </span>
      </motion.header>

      {/* ══════════════════════════════════════════════════════════════════════
          GLASSMORPHIC CARD
          ══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="relative z-10 w-full max-w-xl"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1     }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Outer glow ring */}
        <div className="absolute -inset-px rounded-3xl opacity-50 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(216,185,195,0.2), rgba(77,76,125,0.1))",
          }}
        />

        <div className="relative bg-nebula/85 backdrop-blur-xl
                        border border-nebula rounded-3xl overflow-hidden shadow-card-hover">

          {/* Decorative top gradient bar */}
          <div className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(216,185,195,0.6), transparent)",
            }}
          />

          <div className="px-8 py-10 sm:px-10">

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                PHASE: FORM
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <AnimatePresence mode="wait">
              {phase === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{    opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                  {/* Badge */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1
                                     bg-rose/10 border border-rose/25 rounded-full
                                     text-[10px] font-display font-semibold text-rose
                                     uppercase tracking-widest">
                      <Sparkles size={10} />
                      The Gatekeeper
                    </span>
                    {user?.name && (
                      <span className="text-xs text-white/80 font-sans ml-auto">
                        {user.name}
                      </span>
                    )}
                  </div>

                  <h1 className="text-4xl font-display font-black text-white
                                 tracking-tight leading-tight mb-2">
                    Define Your{" "}
                    <span style={{ color: "#D8B9C3" }}>Target.</span>
                  </h1>
                  <p className="text-white/75 text-sm font-sans mb-8 leading-relaxed">
                    Every quiz, roadmap, and challenge will be calibrated to this single answer.
                    Choose wisely.
                  </p>

                  {/* ── Field 1: Target Role ── */}
                  <div className="mb-6">
                    <label className="block text-xs font-sans font-semibold text-white/80
                                      uppercase tracking-widest mb-2">
                      <Target size={11} className="inline mr-1.5 mb-0.5" />
                      Target Job Role
                    </label>

                    <div className="relative">
                      <input
                        id="onboarding-role"
                        type="text"
                        value={targetRole}
                        onChange={(e) => {
                          setTargetRole(e.target.value);
                          setShowSuggestions(true);
                          if (error) setError("");
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="e.g. Frontend Engineer, Data Scientist…"
                        className="w-full bg-plum/50 border border-amethyst/30 text-white
                                   placeholder-white/40 rounded-xl px-4 py-3.5 text-sm font-sans
                                   transition-all duration-200
                                   focus:outline-none focus:ring-2 focus:ring-rose/35
                                   focus:border-rose/40 hover:border-amethyst/50"
                      />

                      {/* Suggestions dropdown */}
                      <AnimatePresence>
                        {showSuggestions && targetRole.length > 0 && filteredRoles.length > 0 && (
                          <motion.ul
                            className="absolute top-full left-0 right-0 mt-1 z-30
                                       bg-nebula/95 backdrop-blur-xl border border-white/10
                                       rounded-xl overflow-hidden shadow-card"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{    opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                          >
                            {filteredRoles.slice(0, 5).map((role) => (
                              <li
                                key={role}
                                className="px-4 py-2.5 text-sm text-white font-sans cursor-pointer
                                           hover:bg-rose/10 transition-colors duration-150
                                           border-b border-white/5 last:border-0"
                                onMouseDown={() => {
                                  setTargetRole(role);
                                  setShowSuggestions(false);
                                }}
                              >
                                {role}
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Role suggestion chips */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {POPULAR_ROLES.slice(0, 6).map((role) => (
                        <motion.button
                          key={role}
                          type="button"
                          onClick={() => { setTargetRole(role); setShowSuggestions(false); }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-sans border
                                      transition-all duration-200
                                      ${targetRole === role
                                        ? "bg-rose/20 border-rose/50 text-rose"
                                        : "bg-white/5 border-white/10 text-white/70 hover:border-white/40 hover:text-white"
                                      }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {role}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* ── Field 2: Drag-and-drop Resume Upload ── */}
                  <div className="mb-7">
                    <label className="block text-xs font-sans font-semibold text-white/80
                                      uppercase tracking-widest mb-2">
                      <FileText size={11} className="inline mr-1.5 mb-0.5" />
                      Resume Upload
                      <span className="text-white/40 normal-case tracking-normal
                                       font-normal ml-1">(PDF only)</span>
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileInput}
                    />

                    <AnimatePresence mode="wait">
                      {resumeFile ? (
                        /* ── File received state ── */
                        <motion.div
                          key="file-received"
                          className="flex items-center gap-3 p-4 rounded-xl
                                     bg-rose/8 border border-rose/30"
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{    opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="w-9 h-9 rounded-lg bg-rose/15 border border-rose/30
                                          flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-rose" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-sans font-semibold text-white truncate">
                              {resumeFile.name}
                            </p>
                            <p className="text-[10px] text-amethyst mt-0.5">
                              {(resumeFile.size / 1024).toFixed(1)} KB &mdash; Ready for analysis
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setResumeFile(null)}
                            className="text-amethyst hover:text-rose transition-colors duration-200 flex-shrink-0"
                            aria-label="Remove file"
                          >
                            <X size={15} />
                          </button>
                        </motion.div>
                      ) : (
                        /* ── Drop zone ── */
                        <motion.div
                          key="drop-zone"
                          className={`relative flex flex-col items-center justify-center
                                      gap-3 p-8 rounded-xl cursor-pointer
                                      border-2 border-dashed transition-all duration-250
                                      ${isDragging
                                        ? "border-rose/70 bg-rose/8 scale-[1.01]"
                                        : "border-amethyst/35 bg-plum/20 hover:border-amethyst/55 hover:bg-white/[0.03]"
                                      }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => {
  if (status !== "analyzing") {
    handleDrop(e);
  }
}}
                          onClick={() => {
  if (status !== "analyzing") {
    fileInputRef.current?.click();
  }
}}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{    opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          whileHover={{ scale: 1.005 }}
                        >
                          <motion.div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center
                                        transition-colors duration-200
                                        ${isDragging ? "bg-rose/20" : "bg-amethyst/15"}`}
                            animate={isDragging ? { y: [-3, 3, -3] } : { y: 0 }}
                            transition={{ duration: 1, repeat: isDragging ? Infinity : 0 }}
                          >
                            <UploadCloud
                              size={22}
                              className={isDragging ? "text-rose" : "text-amethyst"}
                            />
                          </motion.div>
                          <div className="text-center">
                            <p className="text-sm font-sans font-semibold text-white">
                              {isDragging ? "Drop it right here →" : "Drop your resume here"}
                            </p>
                            <p className="text-[11px] text-white/60 mt-0.5">
                              or{" "}
                              <span className="text-rose underline underline-offset-2">
                                click to browse
                              </span>{" "}
                              &mdash; PDF, max 5MB
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        className="text-[11px] text-red-400 font-sans mb-4 flex items-center gap-1.5"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{    opacity: 0 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* ── Analyze CTA ── */}
                  <motion.button
                    id="onboarding-analyze-btn"
                    type="button"
                    onClick={handleAnalyze}
                    className="w-full flex items-center justify-center gap-2.5
                               font-display font-bold text-plum text-base
                               py-4 rounded-xl overflow-hidden relative group"
                    style={{ backgroundColor: "#D8B9C3" }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    animate={{
                      boxShadow: [
                        "0 0 10px 2px rgba(216,185,195,0.2)",
                        "0 0 28px 8px rgba(216,185,195,0.45)",
                        "0 0 10px 2px rgba(216,185,195,0.2)",
                      ],
                    }}
                    transition={{
                      boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                    }}
                  >
                    {/* Shimmer overlay */}
                    <span className="absolute inset-0 translate-x-[-110%]
                                     group-hover:translate-x-[110%]
                                     bg-gradient-to-r from-transparent via-white/30 to-transparent
                                     transition-transform duration-700 ease-in-out" />
                    <Cpu size={18} />
                    Analyze My Profile
                    <ChevronRight size={17} />
                  </motion.button>

                  <p className="text-center text-[10px] text-white/40 font-sans mt-4">
                    Resume is optional — you can add it later from your profile.
                  </p>
                </motion.div>
              )}

              {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  PHASE: PROCESSING (scanning animation)
                  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {phase === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1    }}
                  exit={{    opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <div className="text-center mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1
                                     bg-amethyst/15 border border-amethyst/30 rounded-full
                                     text-[10px] font-display font-semibold text-amethyst
                                     uppercase tracking-widest">
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-rose"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      AI Analysis Running
                    </span>
                  </div>

                  <ScannerAnimation msgIndex={scanMsgIdx} />

                  <p className="text-center text-xs text-amethyst/50 font-sans mt-4">
                    Mapping your trajectory for{" "}
                    <span className="text-rose font-semibold">{targetRole}</span>
                  </p>
                </motion.div>
              )}

              {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  PHASE: SUCCESS
                  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
              {phase === "success" && (
                <motion.div
                  key="success"
                  className="flex flex-col items-center text-center gap-5 py-2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1    }}
                  exit={{    opacity: 0             }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <SuccessCheckmark />

                  <div>
                    <motion.h2
                      className="text-3xl font-display font-black text-white tracking-tight"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0  }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                    >
                      Trajectory Calibrated
                    </motion.h2>
                    <motion.p
                      className="text-rose font-display font-bold text-xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0  }}
                      transition={{ delay: 0.55, duration: 0.4 }}
                    >
                      Successfully.
                    </motion.p>
                  </div>

                  {/* Role + baseline stats */}
                  <motion.div
                    className="w-full bg-plum/40 border border-white/8 rounded-2xl
                               px-6 py-4 flex items-center justify-between"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0  }}
                    transition={{ delay: 0.65, duration: 0.4 }}
                  >
                    <div className="text-left">
                      <p className="text-[10px] text-amethyst uppercase tracking-widest font-sans">
                        Target Role
                      </p>
                      <p className="text-white font-display font-semibold mt-0.5">
                        {targetRole}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-amethyst uppercase tracking-widest font-sans">
                        Starting Level
                      </p>
                      <p className="text-rose font-display font-bold text-lg mt-0.5">
                        Level 1
                      </p>
                    </div>
                  </motion.div>

                  <motion.p
                    className="text-sm text-amethyst font-sans leading-relaxed max-w-xs"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                  >
                    Your personalised DSA roadmap, mock interview schedule, and aptitude lab are
                    ready. Let's build your placement story.
                  </motion.p>

                  {/* Final CTA */}
                  <motion.button
                    id="onboarding-start-journey-btn"
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="w-full flex items-center justify-center gap-2.5
                               font-display font-bold text-plum text-base
                               py-4 rounded-xl relative overflow-hidden group"
                    style={{ backgroundColor: "#D8B9C3" }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, boxShadow: [
                      "0 0 10px 2px rgba(216,185,195,0.25)",
                      "0 0 30px 10px rgba(216,185,195,0.55)",
                      "0 0 10px 2px rgba(216,185,195,0.25)",
                    ] }}
                    transition={{
                      opacity: { delay: 1, duration: 0.45 },
                      y:       { delay: 1, duration: 0.45 },
                      boxShadow: { delay: 1.2, duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span className="absolute inset-0 translate-x-[-110%]
                                     group-hover:translate-x-[110%]
                                     bg-gradient-to-r from-transparent via-white/30 to-transparent
                                     transition-transform duration-700 ease-in-out" />
                    <Rocket size={18} />
                    [ Start Your Journey ➔ ]
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Decorative bottom gradient bar */}
          <div className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(130,115,151,0.4), transparent)",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
