/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0f0f0f",
        surface: "#1a1a1a",
        elevated: "#242424",
        border: "#2e2e2e",
        "border-focus": "#e85d04",
        primary: {
          DEFAULT: "#e85d04",
          hover: "#f48c06",
          muted: "rgba(232, 93, 4, 0.08)",
        },
        text: {
          primary: "#f5f5f5",
          secondary: "#a3a3a3",
          muted: "#525252",
        },
        pass: "#22c55e",
        fail: "#ef4444",
        warn: "#f59e0b",
        chart: {
          relevance: "#60a5fa",
          accuracy: "#22c55e",
          depth: "#f59e0b",
          regression: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Ubuntu", "system-ui", "sans-serif"],
        mono: ["Ubuntu Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
