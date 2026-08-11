import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSearch,
  UploadCloud,
  FileText,
  X,
  Link2,
  Linkedin,
  Cpu,
  ChevronRight,
  Sparkles,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 1: Smart Profile & Resume Analyzer (Refactored & Gemini-Live)
// Color contract: text-white (primary) | text-white/80 (labels) | text-white/40 (muted/placeholder)
// ─────────────────────────────────────────────────────────────────────────────

// ── Palette tokens ────────────────────────────────────────────────────────────
const C = {
  label:       "rgba(255,255,255,0.80)",
  muted:       "rgba(255,255,255,0.40)",
  border:      "rgba(255,255,255,0.10)",
  borderDash:  "rgba(255,255,255,0.28)",
  cardBg:      "rgba(77,76,125,0.35)",
  cardBorder:  "rgba(255,255,255,0.09)",
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/* ── Section label ── */
function FieldLabel({ children }) {
  return (
    <label className="block text-[11px] font-sans font-semibold uppercase tracking-widest mb-2"
      style={{ color: C.label }}>
      {children}
    </label>
  );
}

/* ── Text input ── */
function ProfileInput({ id, label, icon: Icon, value, onChange, placeholder }) {
  return (
    <div>
      <FieldLabel>
        {Icon && <Icon size={10} className="inline mr-1.5 mb-0.5" style={{ color: C.label }} />}
        {label}
      </FieldLabel>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm font-sans text-white
                   outline-none transition-all duration-200
                   focus:ring-2 focus:ring-rose/35 focus:border-rose/40"
        style={{
          background: "rgba(36,34,72,0.65)",
          border: `1px solid ${C.border}`,
          color: "#ffffff",
        }}
      />
      <style>{`#${id}::placeholder { color: ${C.muted}; }`}</style>
    </div>
  );
}

/* ── Translucent Glass feedback card ── */
function FeedbackCard({ title, icon: Icon, statusText, statusColor = "text-white/40", children }) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col relative"
      style={{
        background: C.cardBg,
        backdropFilter: "blur(12px)",
        border: `1px solid ${C.cardBorder}`,
      }}
    >
      {/* Light gradient highlight border */}
      <div className="absolute inset-0 border border-transparent rounded-2xl pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)",
          WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "destination-out",
          maskComposite: "exclude",
        }}
      />

      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose/10 border border-rose/25
                          flex items-center justify-center flex-shrink-0">
            <Icon size={15} className="text-rose" />
          </div>
          <p className="text-white font-display font-bold text-sm">{title}</p>
        </div>
        {statusText && (
          <span className={`text-[10px] uppercase tracking-wider font-semibold font-display ${statusColor}`}>
            {statusText}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="px-5 py-4 flex-1">
        <div className="text-white/80 text-[13px] leading-relaxed font-sans">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ResumeAnalyzerPage({ setActiveView, setUser }) {
  const user       = JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const targetRole = user?.targetRole || "Software Engineer";

  const [pdfFile,      setPdfFile]      = useState(null);
  const [portfolio,    setPortfolio]    = useState("");
  const [linkedin,     setLinkedin]     = useState("");
  const [isDragging,   setIsDragging]   = useState(false);
  const [status,       setStatus]       = useState(() => {
    return user?.feature_data?.analysisCompleted ? "complete" : "idle";
  });
  const [analysisData, setAnalysisData] = useState(() => {
    if (user?.feature_data?.analysisCompleted && user?.feature_data?.resume) {
      return {
        resume: user.feature_data.resume,
        portfolio: user.feature_data.portfolio,
        linkedin: user.feature_data.linkedin,
        resume_missing_keywords: user.feature_data.resume_missing_keywords || [],
      };
    }
    return null;
  });
  const [error, setError]               = useState("");
  const fileInputRef = useRef(null);

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  function handleDragOver(e)  { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave()  { setIsDragging(false); }
  function handleDrop(e) {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") setPdfFile(file);
  }
  function handleFileInput(e) {
    const file = e.target.files[0];
    if (file) setPdfFile(file);
  }

  // ── Analyze (Call Live Gemini API via Backend) ──────────────────────────────
  async function handleAnalyze() {

    if (status === "analyzing") return;

    // Prevent empty analysis
    if (!pdfFile && !portfolio && !linkedin) {
        setError(
            "Please upload a resume or provide a Portfolio/LinkedIn link."
        );
        return;
    }

    setError("");
    setStatus("analyzing");

    const resumeText = pdfFile 
      ? `Resume file name: ${pdfFile.name}. File size: ${(pdfFile.size / 1024).toFixed(1)} KB.` 
      : "No resume document uploaded.";

    try {
      const response = await api.post("/analyze-profile", {
        resumeText,
        portfolioUrl: portfolio,
        linkedinUrl: linkedin,
      });

      if (response.data?.success && response.data?.data) {
        setAnalysisData(response.data.data);
        setStatus("complete");
        if (response.data?.user) {
  localStorage.setItem(
    "nexora_user",
    JSON.stringify(response.data.user)
  );

  setUser(response.data.user);
}
      } else {
        throw new Error("Invalid response format received from server.");
      }
    } catch (error) {
  console.error("Profile analysis error:", error);

  setStatus("idle");

  if (error.code === "ECONNABORTED") {
    setError(
      "AI analysis is taking longer than expected. Please wait a few seconds and try again."
    );
  } else {
    setError(
      error.response?.data?.message ||
      "Failed to analyze your profiles. Please try again."
    );
  }
}
  }

  return (
    <div className="p-6 lg:p-10 min-h-full">

      {/* ── Page header ── */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                       font-display font-semibold uppercase tracking-widest border"
            style={{ background: "rgba(216,185,195,0.08)", borderColor: "rgba(216,185,195,0.25)", color: "#D8B9C3" }}
          >
            <Sparkles size={9} />
            Feature 1 — Live
          </span>
        </div>
        <h1 className="text-3xl font-display font-black text-white tracking-tight">
          Smart Profile &amp; Resume Analyzer
        </h1>
        <p className="mt-1.5 text-sm font-sans" style={{ color: C.label }}>
          Upload your resume, paste your portfolio and LinkedIn — the AI surfaces your feedback
          calibrated entirely for <span style={{ color: "#D8B9C3", fontWeight: 600 }}>{targetRole}</span>.
        </p>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          TWO-COLUMN GRID
          ══════════════════════════════════════════════════════════════════════ */}
      <div
  className={
    status === "complete"
      ? "flex flex-col gap-6"
      : "grid grid-cols-1 xl:grid-cols-2 gap-6"
  }
>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━
            LEFT — Input Systems
            ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {status !== "complete" && (
        <motion.div
          className="flex flex-col gap-5"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0   }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          {status !== "complete" ? (
            <>
          {/* ── 1. File Drop Container ── */}
          <div>
            <FieldLabel>
              <UploadCloud size={10} className="inline mr-1.5 mb-0.5" />
              Resume Document
            </FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileInput}
            />
            <AnimatePresence mode="wait">
              {pdfFile ? (
                <motion.div
                  key="file-present"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                  style={{
                    background: "rgba(216,185,195,0.07)",
                    border: "1px solid rgba(216,185,195,0.30)",
                  }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{    opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-rose/15 border border-rose/30
                                  flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-rose" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold font-sans truncate">
                      {pdfFile.name}
                    </p>
                    <p className="text-[11px] font-sans mt-0.5" style={{ color: C.muted }}>
                      {(pdfFile.size / 1024).toFixed(1)} KB &mdash; PDF verified
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="flex-shrink-0 transition-colors duration-200"
                    style={{ color: C.muted }}
                    onMouseEnter={e => e.currentTarget.style.color = "#D8B9C3"}
                    onMouseLeave={e => e.currentTarget.style.color = C.muted}
                    aria-label="Remove file"
                  >
                    <X size={15} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="drop-zone"
                  className="flex flex-col items-center justify-center gap-3 py-10
                             rounded-xl cursor-pointer transition-all duration-250"
                  style={{
                    border: `2px dashed ${isDragging ? "rgba(216,185,195,0.65)" : C.borderDash}`,
                    background: isDragging ? "rgba(216,185,195,0.05)" : "transparent",
                    transform: isDragging ? "scale(1.01)" : "scale(1)",
                  }}
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
                  whileHover={{ scale: 1.005 }}
                >
                  <motion.div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                      background: isDragging ? "rgba(216,185,195,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isDragging ? "rgba(216,185,195,0.4)" : C.border}`,
                    }}
                    animate={isDragging ? { y: [-3, 3, -3] } : {}}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  >
                    <UploadCloud
                      size={22}
                      style={{ color: isDragging ? "#D8B9C3" : C.muted }}
                    />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-white text-sm font-sans font-medium">
                      {isDragging ? "Release to upload →" : "Drop your resume here"}
                    </p>
                    <p className="text-xs font-sans mt-0.5" style={{ color: C.muted }}>
                      or{" "}
                      <span style={{ color: "#D8B9C3", textDecoration: "underline", textUnderlineOffset: 3 }}>
                        click to browse
                      </span>
                      {" "}— PDF only, max 5 MB
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── 2. Portfolio input ── */}
          <ProfileInput
            id="portfolio-input"
            label="Portfolio Link"
            icon={Link2}
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
            placeholder="https://yourportfolio.dev"
          />

          {/* ── 3. LinkedIn input ── */}
          <ProfileInput
            id="linkedin-input"
            label="LinkedIn Profile Link"
            icon={Linkedin}
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/your-handle"
          />

          {/* ── 4. Analyze CTA ── */}
          <motion.button
            id="resume-analyze-btn"
            type="button"
            onClick={handleAnalyze}
            disabled={status === "analyzing"}
            className="w-full flex items-center justify-center gap-2.5
                       font-display font-bold text-plum text-[15px]
                       py-4 rounded-xl overflow-hidden relative group
                       disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#D8B9C3" }}
            whileHover={status !== "analyzing" ? { scale: 1.02 } : {}}
            whileTap={status !== "analyzing"   ? { scale: 0.97 } : {}}
            animate={{
              boxShadow: [
                "0 0 10px 2px rgba(216,185,195,0.18)",
                "0 0 28px 8px rgba(216,185,195,0.42)",
                "0 0 10px 2px rgba(216,185,195,0.18)",
              ],
            }}
            transition={{
              boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            {/* Shimmer */}
            <span className="absolute inset-0 translate-x-[-110%]
                             group-hover:translate-x-[110%]
                             bg-gradient-to-r from-transparent via-white/25 to-transparent
                             transition-transform duration-700 ease-in-out" />
            {status === "analyzing" ? (
              <><Loader2 size={17} className="animate-spin" /> Analyzing Profiles…</>
            ) : (
              <><Cpu size={17} /> [ Analyze Digital Profiles ] <ChevronRight size={15} /></>
            )}
          </motion.button>

          {/* Analysis hint */}
          {/* Error Message */}
{error && (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    className="mt-4 rounded-xl p-3"
    style={{
      background: "rgba(216,185,195,0.08)",
      border: "1px solid rgba(216,185,195,0.25)",
    }}
  >
    <p className="text-sm text-white/90 font-sans">
      {error}
    </p>
  </motion.div>
)}

{/* Analysis hint */}
<p
  className="text-xs font-sans text-center mt-4"
  style={{ color: "rgba(255,255,255,0.30)" }}
>
  Resume is optional — portfolio & LinkedIn are also analyzed independently.
</p>
</>

) : (

<div
  className="rounded-2xl p-6 flex flex-col gap-5"
  style={{
    background: C.cardBg,
    backdropFilter: "blur(12px)",
    border: `1px solid ${C.cardBorder}`,
  }}
>

  <h2 className="text-xl font-display font-bold text-white">
    Profile Summary
  </h2>

  <div className="space-y-4">

    <div>
      <p className="text-white/60 text-xs uppercase tracking-wider">
        Resume
      </p>

      <p className="text-white font-medium">
        {pdfFile ? "✓ Resume Uploaded" : "✗ No Resume"}
      </p>

      {pdfFile && (
        <p className="text-white/50 text-sm mt-1">
          {pdfFile.name}
        </p>
      )}
    </div>

    <div>
      <p className="text-white/60 text-xs uppercase tracking-wider">
        Portfolio
      </p>

      <p className="text-white font-medium">
        {portfolio
          ? "✓ Portfolio Connected"
          : "✗ Portfolio Missing"}
      </p>
    </div>

    <div>
      <p className="text-white/60 text-xs uppercase tracking-wider">
        LinkedIn
      </p>

      <p className="text-white font-medium">
        {linkedin
          ? "✓ LinkedIn Connected"
          : "✗ LinkedIn Missing"}
      </p>
    </div>

    <div>
      <p className="text-white/60 text-xs uppercase tracking-wider">
        Target Role
      </p>

      <p className="text-white font-semibold">
        {targetRole}
      </p>
    </div>

  </div>

  <motion.button
    onClick={() => {
      setStatus("idle");
      setAnalysisData(null);
      setError("");
    }}
    className="mt-4 w-full py-4 rounded-xl bg-rose text-plum font-display font-bold"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    Analyze Again
  </motion.button>

</div>

)}
        </motion.div>
            )}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            RIGHT — Real-Time Analysis Display
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          className={
  status === "complete"
    ? "w-full flex flex-col gap-6"
    : "flex flex-col gap-5"
}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0  }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          {status === "complete" && analysisData ? (
            <>
            <div className="mb-6">
  <button
    onClick={() => {
      setStatus("idle");
      setAnalysisData(null);
      setError("");
    }}
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full
               bg-white/5 border border-white/10
               hover:bg-white/10 transition-all duration-200"
  >
    <ArrowLeft size={16} />
    <span className="text-sm font-medium">
      Upload Another Resume
    </span>
  </button>
</div>
            <motion.div
              className="flex flex-col gap-5"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {/* Category A: Resume Feedback */}
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <FeedbackCard
                  title="Your Resume Review"
                  icon={FileText}
                  statusText="Scanned"
                  statusColor="text-rose"
                >
                  <div className="space-y-3">
                    {analysisData.resume?.good?.length > 0 && (
                      <div>
                        <p className="font-semibold text-white mb-1">🟢 What looks great:</p>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {analysisData.resume.good.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisData.resume?.fixes?.length > 0 && (
                      <div>
                        <p className="font-semibold text-white mb-1">⚠️ Easy fixes to make:</p>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {analysisData.resume.fixes.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </FeedbackCard>
              </motion.div>

              {/* Category B: Portfolio Feedback */}
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <FeedbackCard
                  title="Your Project Portfolio Review"
                  icon={Link2}
                  statusText={portfolio ? "Connected" : "Missing"}
                  statusColor={portfolio ? "text-emerald-400" : "text-amber-400"}
                >
                  <div className="space-y-3">
                    {analysisData.portfolio?.good?.length > 0 && (
                      <div>
                        <p className="font-semibold text-white mb-1">🟢 What looks great:</p>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {analysisData.portfolio.good.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisData.portfolio?.fixes?.length > 0 && (
                      <div>
                        <p className="font-semibold text-white mb-1">⚠️ Easy fixes to make:</p>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {analysisData.portfolio.fixes.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </FeedbackCard>
              </motion.div>

              {/* Category C: LinkedIn Feedback */}
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <FeedbackCard
                  title="Your LinkedIn Profile Review"
                  icon={Linkedin}
                  statusText={linkedin ? "Connected" : "Not Linked"}
                  statusColor={linkedin ? "text-rose" : "text-white/40"}
                >
                  <div className="space-y-3">
                    {analysisData.linkedin?.good?.length > 0 && (
                      <div>
                        <p className="font-semibold text-white mb-1">🟢 What looks great:</p>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {analysisData.linkedin.good.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisData.linkedin?.fixes?.length > 0 && (
                      <div>
                        <p className="font-semibold text-white mb-1">⚠️ Easy fixes to make:</p>
                        <ul className="list-disc pl-5 space-y-1 text-white/80">
                          {analysisData.linkedin.fixes.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </FeedbackCard>
                <div
  className="rounded-2xl p-8 text-center mt-6"
  style={{
    background: C.cardBg,
    border: `1px solid ${C.cardBorder}`,
  }}
>

  <h2 className="text-2xl font-display font-bold text-white">
    🎉 Analysis Complete
  </h2>

<p className="mt-6 text-white/70 max-w-xl mx-auto leading-7">
  Every expert was once a beginner. Your personalized Tutor Tree is ready—
  take the next step, keep learning, and grow one skill at a time. 🌱
</p>

  <motion.button
      onClick={() => setActiveView("roadmap")}
      className="mt-8 px-8 py-4 rounded-xl bg-rose text-plum font-display font-bold"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
  >
      🚀 Continue To TutorTree!
  </motion.button>

</div>
              </motion.div>
            </motion.div>

            </>
          ) : status === "analyzing" ? (
            <div
              className="rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[350px]"
              style={{
                background: C.cardBg,
                backdropFilter: "blur(12px)",
                border: `1px solid ${C.cardBorder}`,
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose/10 border border-rose/25
                              flex items-center justify-center mb-4 relative">
                <Loader2 size={22} className="text-rose animate-spin" />
              </div>
              <h3 className="font-display font-bold text-white text-base mb-1">Analyzing Profiles…</h3>
              <p className="text-white/60 text-xs max-w-sm mb-4">
                Nexora AI is scanning your resume structure and checking link connections.
              </p>
              <div className="w-48 h-1.5 rounded-full overflow-hidden bg-white/5 relative">
                <motion.div
  className="absolute top-0 left-0 h-full w-20 bg-rose rounded-full"
  animate={{
    x: ["-80px", "220px"],
  }}
  transition={{
    repeat: Infinity,
    duration: 1.4,
    ease: "linear",
  }}
/>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[350px]"
              style={{
                background: C.cardBg,
                backdropFilter: "blur(12px)",
                border: `1px solid ${C.cardBorder}`,
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose/10 border border-rose/25
                              flex items-center justify-center mb-4">
                <FileSearch size={22} className="text-rose" />
              </div>
              <h3 className="font-display font-bold text-white text-base mb-1">Awaiting Profile Analysis</h3>
              <p className="text-white/60 text-xs max-w-sm mb-4">
                Upload your resume document and provide profile links to calibrate the AI to your target role.
              </p>
              <span className="text-[11px] text-rose/75 uppercase tracking-wider font-semibold">
                Calibrated for {targetRole}
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
