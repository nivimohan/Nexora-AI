import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X,
  Eye,
  EyeOff,
  Loader2,
  BrainCircuit,
  ArrowRight,
  UserPlus,
  LogIn,
  AlertCircle,
} from "lucide-react";
import AuthIllustration from "./AuthIllustration";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Auth Modal (Login / Sign-up)
// Glassmorphic split card mounted over the landing page via AnimatePresence.
// Left  → credential form
// Right → floating illustration
// ─────────────────────────────────────────────────────────────────────────────

/* ── Reusable input field ── */
function AuthInput({ id, label, type = "text", value, onChange, placeholder, rightSlot }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-sans font-medium text-white/80 tracking-wide uppercase">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-plum/60 border border-amethyst/25 text-white
                     placeholder-amethyst/50 rounded-xl px-4 py-3 text-sm font-sans
                     transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-rose/40 focus:border-rose/40
                     hover:border-amethyst/50"
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AuthModal({ onClose }) {
  const navigate = useNavigate();

  const [isLogin, setIsLogin]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  // ── Field change handler ──
  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  }

  // ── Toggle Login ↔ Sign-up ──
  function toggleMode() {
    setIsLogin((v) => !v);
    setError("");
    setForm({ name: "", email: "", password: "" });
  }

  // ── Form submit ──
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!isLogin && !form.name) {
      setError("Please enter your name.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload  = isLogin
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const { data } = await api.post(endpoint, payload);

      if (data.success) {
        // Persist credentials
        localStorage.setItem("nexora_token", data.token);
        localStorage.setItem("nexora_user",  JSON.stringify(data.user));

        // ── Route based on onboarding status ─────────────────────────────────
        // Returning users (onboardingComplete === true) skip the wizard and go
        // straight to the dashboard to preserve all their XP / progress data.
        // New registrations always pass through onboarding first.
        if (data.user?.onboardingComplete) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Backdrop ── */}
      <motion.div
        className="absolute inset-0 bg-plum/75 backdrop-blur-md"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* ── Card ── */}
      <motion.div
        className="relative z-10 w-full max-w-4xl bg-nebula/90
                   backdrop-blur-xl border border-white/10
                   rounded-3xl shadow-card-hover overflow-hidden"
        initial={{ opacity: 0, scale: 0.94, y: 32 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.94, y: 32  }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Glow accents ── */}
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full
                        bg-rose/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full
                        bg-amethyst/15 blur-3xl pointer-events-none" />

        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-xl
                     bg-white/5 border border-white/10 flex items-center justify-center
                     text-amethyst hover:text-white hover:bg-white/10
                     transition-all duration-200"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        {/* ══════════════════════════════════════════════════════════════
            50 / 50 SPLIT GRID
            ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[540px]">

          {/* ══════════════════════
              LEFT — Credential Form
              ══════════════════════ */}
          <div className="flex flex-col justify-center px-8 py-10 sm:px-12">

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-8 h-8 rounded-lg bg-rose/15 border border-rose/30
                              flex items-center justify-center">
                <BrainCircuit size={16} className="text-rose" />
              </div>
              <span className="font-display font-bold text-white text-lg tracking-tight">
                nexora<span className="text-rose">.</span>
              </span>
            </div>

            {/* Title area with mode toggle */}
            <div className="mb-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? "login" : "signup"}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{    opacity: 0, y: 10  }}
                  transition={{ duration: 0.22 }}
                >
                  <h2 className="text-3xl font-display font-black text-white tracking-tight">
                    {isLogin ? "Welcome back." : "Create account."}
                  </h2>
                  <p className="text-sm text-white/80 mt-1.5 font-sans">
                    {isLogin
                      ? "Sign in to continue your placement journey."
                      : "Join Nexora and map your entire trajectory."}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Name field — sign-up only */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{    opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <AuthInput
                      id="auth-name"
                      label="Full Name"
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        handleChange({ target: { name: "name", value: e.target.value } })
                      }
                      placeholder="Alex Johnson"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AuthInput
                id="auth-email"
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  handleChange({ target: { name: "email", value: e.target.value } })
                }
                placeholder="you@university.edu"
              />

              <AuthInput
                id="auth-password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  handleChange({ target: { name: "password", value: e.target.value } })
                }
                placeholder="Minimum 6 characters"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-amethyst hover:text-rose transition-colors duration-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="flex items-start gap-2 bg-red-500/10 border border-red-400/25
                               rounded-xl px-3 py-2.5"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{    opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-red-300 font-sans leading-relaxed">
                      {error}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <motion.button
                type="submit"
                id="nexora-auth-submit"
                disabled={loading}
                className="relative w-full flex items-center justify-center gap-2.5
                           bg-rose text-plum font-display font-bold text-sm
                           py-3.5 rounded-xl overflow-hidden
                           disabled:opacity-60 disabled:cursor-not-allowed
                           group"
                whileHover={loading ? {} : { scale: 1.02 }}
                whileTap={loading  ? {} : { scale: 0.97 }}
                animate={{
                  boxShadow: [
                    "0 0 8px 2px rgba(216,185,195,0.15)",
                    "0 0 22px 6px rgba(216,185,195,0.38)",
                    "0 0 8px 2px rgba(216,185,195,0.15)",
                  ],
                }}
                transition={{
                  boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                {/* Shimmer */}
                <span className="absolute inset-0 translate-x-[-100%]
                                 group-hover:translate-x-[100%]
                                 bg-gradient-to-r from-transparent via-white/20 to-transparent
                                 transition-transform duration-700 ease-in-out" />
                {loading ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : isLogin ? (
                  <LogIn size={17} />
                ) : (
                  <UserPlus size={17} />
                )}
                <span>
                  {loading
                    ? "Authenticating…"
                    : isLogin
                    ? "Sign In to Nexora"
                    : "Create My Account"}
                </span>
                {!loading && <ArrowRight size={16} />}
              </motion.button>
            </form>

            {/* Mode toggle */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="text-xs text-amethyst font-sans">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </span>
              <button
                onClick={toggleMode}
                className="text-xs font-display font-semibold text-rose
                           hover:text-white transition-colors duration-200"
              >
                {isLogin ? "Sign up free →" : "Log in →"}
              </button>
            </div>

            {/* Legal micro-copy */}
            <p className="mt-4 text-center text-[10px] text-amethyst/50 font-sans leading-relaxed">
              By continuing you agree to our{" "}
              <span className="text-amethyst/70 cursor-pointer hover:text-rose transition-colors">
                Terms
              </span>{" "}
              &{" "}
              <span className="text-amethyst/70 cursor-pointer hover:text-rose transition-colors">
                Privacy Policy
              </span>
              .
            </p>
          </div>

          {/* ══════════════════════════════
              RIGHT — Floating Illustration
              ══════════════════════════════ */}
          <div
            className="hidden lg:flex items-center justify-center relative
                       border-l border-white/8 bg-plum/30 p-6"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-cosmic-radial opacity-40
                            pointer-events-none" />

            {/* Illustration with anti-gravity float */}
            <motion.div
              className="relative w-full max-w-sm"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            >
              <AuthIllustration />
            </motion.div>

            {/* Label strip */}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5
                               bg-rose/10 border border-rose/25 rounded-full
                               text-[10px] font-display font-semibold text-rose
                               uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-rose animate-pulse" />
                Secure · Role-Mapped · AI-Powered
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
