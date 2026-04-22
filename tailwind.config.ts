import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Vazirmatn Variable"', '"Vazirmatn"', "system-ui", "sans-serif"],
      },
      colors: {
        /** تم روشن/تاریک از طریق متغیرهای CSS در globals.css */
        canvas: "rgb(var(--tw-canvas) / <alpha-value>)",
        panel: "rgb(var(--tw-panel) / <alpha-value>)",
        inset: "rgb(var(--tw-inset) / <alpha-value>)",
        elevated: "rgb(var(--tw-elevated) / <alpha-value>)",
        stroke: "rgb(var(--tw-stroke) / <alpha-value>)",
        ink: "rgb(var(--tw-ink) / <alpha-value>)",
        prose: "rgb(var(--tw-prose) / <alpha-value>)",
        faint: "rgb(var(--tw-faint) / <alpha-value>)",
        surface: "#0f172a",
        brand: {
          cyan: "#00a8ff",
          amber: "#e89420",
          ink: "#050a18",
        },
      },
      borderRadius: {
        shell: "1.75rem",
        card: "2rem",
      },
      keyframes: {
        "section-in": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "section-in": "section-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.45s ease-out both",
      },
      boxShadow: {
        soft: "0 12px 32px rgba(15, 23, 42, 0.08)",
        brand: "0 10px 28px rgba(0, 88, 132, 0.18)",
      },
      ringOffsetColor: {
        canvas: "rgb(var(--tw-canvas) / <alpha-value>)",
        panel: "rgb(var(--tw-panel) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;
