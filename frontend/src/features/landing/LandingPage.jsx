import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  BrainCircuit,
  Rocket,
  Zap,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import InterviewIllustration from "./InterviewIllustration";
import AuthModal from "@/features/auth/AuthModal";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Landing Page (Hero Sector)
// ─────────────────────────────────────────────────────────────────────────────

/* ── Animated background particle ── */
function Particle({ style }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={style}
      animate={{ y: [0, -30, 0], opacity: [0.3, 0.7, 0.3] }}
      transition={{
        duration: Math.random() * 4 + 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay: Math.random() * 3,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [launched,  setLaunched]  = useState(false);
  const [showAuth,  setShowAuth]  = useState(false);

  function handleLaunch() {
    setLaunched(true);
    setShowAuth(true);
    console.log("Launch initiated: transitioning to onboarding wizard");
  }

  // Subtle tilt on mouse move for the right card
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [4, -4]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-4, 4]), { stiffness: 120, damping: 20 });

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }
  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  // Particles config
  const particles = [
    { width: 6, height: 6, top: "12%", left: "8%", backgroundColor: "#D8B9C3", opacity: 0.4 },
    { width: 4, height: 4, top: "68%", left: "5%", backgroundColor: "#827397", opacity: 0.5 },
    { width: 8, height: 8, top: "35%", left: "90%", backgroundColor: "#D8B9C3", opacity: 0.3 },
    { width: 5, height: 5, top: "80%", left: "85%", backgroundColor: "#4D4C7D", opacity: 0.6 },
    { width: 3, height: 3, top: "20%", left: "55%", backgroundColor: "#827397", opacity: 0.4 },
  ];

  return (
    <div className="relative min-h-screen bg-plum overflow-hidden flex items-center">

      {/* ── Cosmic ambient background ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial glow blobs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full
                        bg-nebula/40 blur-[120px]" />
        <div className="absolute -bottom-60 right-0 w-[32rem] h-[32rem] rounded-full
                        bg-amethyst/20 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-64 h-64 rounded-full bg-rose/5 blur-[80px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(216,185,195,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(216,185,195,1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Floating particles */}
        {particles.map((p, i) => <Particle key={i} style={p} />)}
      </div>

      {/* ── Minimal top bar ── */}
      <motion.header
        className="absolute top-0 left-0 right-0 z-20 flex items-center
                   justify-between px-8 py-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose/10 border border-rose/30
                          flex items-center justify-center">
            <BrainCircuit size={16} className="text-rose" />
          </div>
          <span className="font-display font-bold text-white text-lg tracking-tight">
            nexora<span className="text-rose">.</span>
          </span>
        </div>
        
      </motion.header>

      {/* ── HERO GRID ── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16
                       pt-28 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* ════════════════════════════════
            LEFT COLUMN — Copy & CTA
            ════════════════════════════════ */}
        <div className="flex flex-col gap-8">

          {/* Pre-title badge */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                             bg-rose/10 border border-rose/25 text-rose text-xs
                             font-semibold font-display tracking-wider uppercase">
              <Sparkles size={11} />
              AI-Calibrated Placement Engine
              <Sparkles size={11} />
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-6xl sm:text-7xl xl:text-8xl font-display font-black
                           leading-[0.92] tracking-tight text-white">
              Nexora
            </h1>
            <h1 className="text-6xl sm:text-7xl xl:text-8xl font-display font-black
                           leading-[0.92] tracking-tight text-rose">
              AI
            </h1>
          </motion.div>

          {/* Sub-headline */}
          <motion.p
            className="text-lg sm:text-xl font-sans font-light leading-relaxed
                       text-amethyst max-w-md"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Escape the gravity of{" "}
            <em className="not-italic font-medium text-white/80">
              generic placement prep.
            </em>{" "}
            A unified, AI-driven sandbox calibrated entirely to your dream job.
          </motion.p>

          {/* Stats strip */}
          <motion.div
            className="flex flex-wrap gap-x-8 gap-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.32 }}
          >
          {[
              { val: "6",    desc: "AI-powered modules" },
              { val: "100%", desc: "Role-calibrated content" },
              { val: "Live", desc: "Real-time XP tracking" },
            ].map(({ val, desc }) => (
              <div key={val} className="flex flex-col">
                <span className="text-2xl font-display font-black text-white">
                  {val}
                </span>
                <span className="text-xs text-amethyst font-sans">{desc}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA button */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42 }}
          >
            <motion.button
              id="nexora-cta-launch"
              onClick={handleLaunch}
              className="relative w-fit inline-flex items-center gap-3 font-display
                         font-bold text-plum text-lg px-8 py-4 rounded-2xl
                         bg-rose overflow-hidden group"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              /* Breathing glow pulse */
              animate={{
                boxShadow: launched
                  ? [
                      "0 0 30px 8px rgba(216,185,195,0.6)",
                      "0 0 50px 16px rgba(216,185,195,0.9)",
                    ]
                  : [
                      "0 0 10px 2px rgba(216,185,195,0.2)",
                      "0 0 28px 8px rgba(216,185,195,0.45)",
                      "0 0 10px 2px rgba(216,185,195,0.2)",
                    ],
              }}
              transition={{
                boxShadow: {
                  duration: launched ? 0.3 : 2.4,
                  repeat: launched ? 0 : Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              {/* Shimmer sweep on hover */}
              <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%]
                               bg-gradient-to-r from-transparent via-white/20 to-transparent
                               transition-transform duration-700 ease-in-out" />
              <Rocket size={20} className={launched ? "animate-bounce" : ""} />
              <span>{launched ? "Launching…" : "[ Initiate Launch ➔ ]"}</span>
            </motion.button>

            {/* Micro-copy */}
            <p className="text-xs font-sans text-amethyst/80 max-w-xs leading-relaxed pl-1">
              No generic question pools. No static templates.{" "}
              <span className="text-amethyst font-medium">
                One target role maps your entire trajectory.
              </span>
            </p>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            className="flex flex-wrap items-center gap-3 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {["DSA Engine", "Resume AI", "Mock Interviews", "Aptitude Lab"].map((badge) => (
              <span
                key={badge}
                className="flex items-center gap-1.5 text-[11px] font-sans
                           text-amethyst/70 border border-amethyst/20
                           rounded-full px-3 py-1"
              >
                <Zap size={9} className="text-rose/60" />
                {badge}
              </span>
            ))}
          </motion.div>
        </div>

        {/* ════════════════════════════════
            RIGHT COLUMN — Anti-Gravity Node
            ════════════════════════════════ */}
        <motion.div
          className="flex justify-center items-center"
          style={{ perspective: "1000px" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          /* Anti-gravity float loop */
          animate={{
            y: [0, -12, 0],
            rotate: [0, 1, 0, -1, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut",
          }}
        >
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative w-full max-w-md"
          >
            {/* Glow backdrop */}
            <div className="absolute inset-0 rounded-3xl bg-rose/10 blur-3xl
                            scale-95 opacity-60 pointer-events-none" />

            {/* ── Illustration Card Shell ── */}
            <div className="relative bg-nebula/80 backdrop-blur-xl border border-white/10
                            rounded-3xl overflow-hidden shadow-card-hover">

              {/* Interview scene illustration */}
              <div className="px-2 pt-2 pb-8">
                <InterviewIllustration />
              </div>

              {/* Bottom label bar — floats over the illustration */}
              <div className="absolute bottom-0 left-0 right-0 px-5 py-3
                              bg-gradient-to-t from-nebula via-nebula/80 to-transparent
                              flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Live pulse indicator */}
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full
                                     rounded-full bg-rose opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose" />
                  </span>
                  <span className="text-[10px] font-sans text-amethyst
                                   uppercase tracking-widest">
                    AI Mock Interview Active
                  </span>
                </div>
                <span className="text-[10px] font-display font-semibold text-rose/60
                                 tracking-wide">
                  nexora<span className="text-rose">.</span>ai
                </span>
              </div>
            </div>

            {/* Floating accent chips — orbit outside the card */}
            <motion.div
              className="absolute -top-5 -right-4 badge shadow-glow-rose"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles size={10} /> AI-Powered
            </motion.div>
            <motion.div
              className="absolute -bottom-5 -left-4 badge shadow-glow-nebula"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <Zap size={10} /> Role-Mapped
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      {/* ── Bottom fade ── */}
      <div className="absolute bottom-0 left-0 right-0 h-24
                      bg-gradient-to-t from-plum to-transparent pointer-events-none" />

      {/* ── Auth Modal (mounted over landing when CTA is clicked) ── */}
      <AnimatePresence>
        {showAuth && (
          <AuthModal onClose={() => { setShowAuth(false); setLaunched(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
