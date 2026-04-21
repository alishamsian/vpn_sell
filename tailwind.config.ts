import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0f172a",
        border: "#1e293b",
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
    },
  },
  plugins: [],
};

export default config;
