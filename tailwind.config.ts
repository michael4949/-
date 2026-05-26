import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 政务深蓝主色调
        gov: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // 数据大屏霓虹色
        cyber: {
          cyan: "#22d3ee",
          blue: "#3b82f6",
          purple: "#a855f7",
          pink: "#ec4899",
          green: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
        },
        // 大屏背景
        screen: {
          bg: "#020817",
          panel: "rgba(15, 23, 42, 0.6)",
          border: "rgba(56, 189, 248, 0.2)",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
        digital: ['"DM Mono"', '"Roboto Mono"', "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scan": "scan 3s linear infinite",
        "marquee": "marquee 30s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 6px currentColor)" },
          "50%": { opacity: "0.5", filter: "drop-shadow(0 0 12px currentColor)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
