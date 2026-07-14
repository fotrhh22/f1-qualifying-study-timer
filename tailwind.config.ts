import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dashboard: {
          canvas: "#06080D",
          panel: "#0C1018",
          surface: "#131925",
          hover: "#19202D",
          border: "#242B38",
          primary: "#F7F8FB",
          secondary: "#9299AA",
          muted: "#626A7D",
          red: "#FF3155",
          lime: "#BAFF24",
          yellow: "#FFD340",
          blue: "#41B9EC",
          success: "#6DF1A8",
          sector1: "#F0448B",
          sector2: "#F5C451",
          sector3: "#2FC4D4",
        },
        f1: {
          red: "#E10600",
          black: "#000000",
          white: "#FFFFFF",
          gray: "#38383F",
          "gray-light": "#67676D",
          "gray-dark": "#1A1A1F",
          "panel": "#0A0A0F",
          "border": "#2A2A2F",
        },
        team: {
          redbull: "#3671C6",
          mclaren: "#FF8000",
          ferrari: "#E8002D",
          mercedes: "#27F4D2",
          aston: "#229971",
          alpine: "#FF87BC",
          haas: "#B6BABD",
          williams: "#64C4FF",
          sauber: "#52E252",
          cadillac: "#6CD3BF",
        },
      },
      fontFamily: {
        f1: ["'Formula1'", "'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      animation: {
        "pulse-red": "pulse-red 1s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "slide-in": {
          from: { transform: "translateX(-10px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
