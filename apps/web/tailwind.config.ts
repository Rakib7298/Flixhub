import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        matrix: {
          bg: "#080A0D",
          surface: "#101317",
          card: "#181C22",
          red: "#E50914",
          green: "#22C55E",
          yellow: "#F5B942",
          muted: "#A1A1AA",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glass: "0 16px 60px rgba(0, 0, 0, 0.35)",
        glow: "0 0 45px rgba(229, 9, 20, 0.22)",
      },
      backgroundImage: {
        "radial-spotlight": "radial-gradient(circle at 70% 25%, rgba(229,9,20,.17), transparent 34%), radial-gradient(circle at 15% 80%, rgba(38,75,112,.16), transparent 35%)",
      },
      animation: {
        shimmer: "shimmer 1.8s infinite",
        "fade-up": "fade-up .6s ease-out both",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
