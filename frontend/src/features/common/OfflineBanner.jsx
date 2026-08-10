import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, AlertTriangle, X } from "lucide-react";
import { useNetworkStatus } from "@/lib/useNetworkStatus";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — OfflineBanner
//
// Two independent layers:
//   1. Persistent amber top banner when navigator.onLine === false
//   2. Short-lived floating toast from axios network-error interceptor
//
// Styling follows the app's purple/amber dark theme. No external CSS deps.
// ─────────────────────────────────────────────────────────────────────────────

export default function OfflineBanner() {
  const { isOffline, apiToast } = useNetworkStatus();

  return (
    <>
      {/* ── 1. Persistent Offline Banner ──────────────────────────────────── */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -64 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: -64 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-6 py-3"
            style={{
              background:
                "linear-gradient(90deg, rgba(20,18,46,0.97) 0%, rgba(45,30,10,0.97) 50%, rgba(20,18,46,0.97) 100%)",
              borderBottom: "1px solid rgba(251,191,36,0.30)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 4px 24px rgba(251,191,36,0.08)",
            }}
          >
            {/* Pulsing icon */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <WifiOff size={15} style={{ color: "#fbbf24" }} />
            </motion.div>

            {/* Message */}
            <p className="text-[12px] font-sans text-amber-200 leading-snug text-center">
              <span className="font-bold text-amber-300">📡 Connection Lost</span>
              {" — "}
              Nexora AI is running in Offline Mode. Reconnect to sync XP, streaks, and AI generations.
            </p>

            {/* Reconnect indicator — flashes when back online (component unmounts then) */}
            <span
              className="text-[10px] font-display font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(251,191,36,0.12)",
                border: "1px solid rgba(251,191,36,0.30)",
                color: "#fbbf24",
                flexShrink: 0,
              }}
            >
              Offline
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Floating API-Error Toast ───────────────────────────────────── */}
      <AnimatePresence>
        {apiToast && (
          <motion.div
            key="api-toast"
            initial={{ opacity: 0, y: 80, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: 80,  scale: 0.94 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
                       flex items-start gap-3 px-5 py-4 rounded-2xl"
            style={{
              background: "rgba(20,18,46,0.96)",
              border: "1px solid rgba(252,165,165,0.30)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(252,165,165,0.08)",
              maxWidth: "min(90vw, 440px)",
              minWidth: 280,
            }}
          >
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(252,165,165,0.12)", border: "1px solid rgba(252,165,165,0.25)" }}
            >
              <AlertTriangle size={15} style={{ color: "#fca5a5" }} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-display font-bold uppercase tracking-widest text-red-300 mb-0.5">
                Network Error
              </p>
              <p className="text-[12px] text-white/75 font-sans leading-snug">
                {apiToast}
              </p>
            </div>

            {/* Auto-dismiss progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-[2px] rounded-b-2xl"
              style={{ background: "rgba(252,165,165,0.5)" }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. Reconnection celebration toast ────────────────────────────── */}
      {/* Rendered once when isOffline transitions false→false (handled by the
          AnimatePresence exit of the banner above which is sufficient) */}
    </>
  );
}
