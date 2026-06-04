/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
    "./types.ts",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      colors: {
        page: "#F5F7FB",
        line: "#E9ECF3",
        brand: {
          DEFAULT: "#3358F4",
          50: "#EEF1FE",
          100: "#DEE6FD",
          500: "#3358F4",
          600: "#2745D8",
          700: "#1E36B8",
        },
        ink: {
          DEFAULT: "#0F1729",
          soft: "#39425A",
          muted: "#8A93A6",
          faint: "#AEB6C6",
        },
        success: { DEFAULT: "#0FA968", soft: "#E5F7EF" },
        warning: { DEFAULT: "#E08600", soft: "#FCF1DE" },
        danger: { DEFAULT: "#E23D5B", soft: "#FCEAEE" },
        violet2: { DEFAULT: "#6D5EF6", soft: "#EFEDFE" },
        teal2: { DEFAULT: "#0FB5BA", soft: "#E3F7F7" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,41,0.04), 0 1px 3px rgba(15,23,41,0.05)",
        soft: "0 6px 22px rgba(15,23,41,0.07)",
        pop: "0 16px 48px rgba(15,23,41,0.14)",
      },
      borderRadius: { xl2: "1.125rem" },
      keyframes: {
        fadeup: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(51,88,244,0.35)" },
          "70%": { boxShadow: "0 0 0 10px rgba(51,88,244,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(51,88,244,0)" },
        },
      },
      animation: {
        fadeup: "fadeup .45s cubic-bezier(.2,.7,.3,1) both",
        pulseRing: "pulseRing 1.8s infinite",
      },
    },
  },
  plugins: [],
};
