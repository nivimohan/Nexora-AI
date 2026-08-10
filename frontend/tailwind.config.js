/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ─────────────────────────────────────────────
      // NEXORA AI — Cosmic Palette
      // ─────────────────────────────────────────────
      colors: {
        plum:      "#363062",  // Deep Cosmic Plum  — background canvas, sidebar
        nebula:    "#4D4C7D",  // Muted Nebula Purple — card backgrounds, containers
        amethyst:  "#827397",  // Amethyst Slate     — secondary text, dividers
        rose:      "#D8B9C3",  // Soft Pastel Rose   — CTA accent, active nav, rings
      },

      // ─────────────────────────────────────────────
      // Typography
      // ─────────────────────────────────────────────
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },

      // ─────────────────────────────────────────────
      // Spacing / Sizing Tokens
      // ─────────────────────────────────────────────
      spacing: {
        "18":  "4.5rem",
        "22":  "5.5rem",
        "72":  "18rem",
        "88":  "22rem",
        "128": "32rem",
      },

      // ─────────────────────────────────────────────
      // Border Radii
      // ─────────────────────────────────────────────
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },

      // ─────────────────────────────────────────────
      // Box Shadows — Cosmic Glow System
      // ─────────────────────────────────────────────
      boxShadow: {
        "glow-rose":     "0 0 20px 4px rgba(216, 185, 195, 0.25)",
        "glow-nebula":   "0 0 20px 4px rgba(77, 76, 125, 0.45)",
        "glow-plum":     "0 0 30px 6px rgba(54, 48, 98, 0.6)",
        "card":          "0 4px 24px rgba(54, 48, 98, 0.5)",
        "card-hover":    "0 8px 40px rgba(54, 48, 98, 0.75)",
        "inner-glow":    "inset 0 1px 0 rgba(216, 185, 195, 0.15)",
      },

      // ─────────────────────────────────────────────
      // Background Gradients
      // ─────────────────────────────────────────────
      backgroundImage: {
        "cosmic-radial":   "radial-gradient(ellipse at top, #4D4C7D 0%, #363062 60%)",
        "rose-gradient":   "linear-gradient(135deg, #D8B9C3 0%, #827397 100%)",
        "plum-gradient":   "linear-gradient(180deg, #4D4C7D 0%, #363062 100%)",
        "card-shimmer":    "linear-gradient(135deg, rgba(77,76,125,0.6) 0%, rgba(54,48,98,0.9) 100%)",
        "glass":           "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
      },

      // ─────────────────────────────────────────────
      // Animations
      // ─────────────────────────────────────────────
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px 2px rgba(216, 185, 195, 0.2)" },
          "50%":       { boxShadow: "0 0 25px 6px rgba(216, 185, 195, 0.5)" },
        },
        "spin-slow": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "float":        "float 6s ease-in-out infinite",
        "float-slow":   "float 9s ease-in-out infinite",
        "shimmer":      "shimmer 2.5s linear infinite",
        "pulse-glow":   "pulse-glow 2s ease-in-out infinite",
        "spin-slow":    "spin-slow 12s linear infinite",
      },

      // ─────────────────────────────────────────────
      // Backdrop Blur
      // ─────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
