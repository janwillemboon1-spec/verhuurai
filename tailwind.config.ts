import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAF9F7",
        primary: "#1B2B4B",
        accent: "#FF6B6B",
        "accent-gold": "#D4A843",
        "text-primary": "#1B2B4B",
        "text-secondary": "#6B7280",
        surface: "#FFFFFF",
        border: "#E8E4DF",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: { xl: "16px", "2xl": "20px", "3xl": "24px" },
      boxShadow: {
        card: "0 2px 16px rgba(27,43,75,0.08)",
        "card-hover": "0 8px 32px rgba(27,43,75,0.14)",
        xl: "0 20px 60px rgba(27,43,75,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
