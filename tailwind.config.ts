import type { Config } from "tailwindcss";

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        surface: c("surface"),
        surface2: c("surface2"),
        ink: c("ink"),
        muted: c("muted"),
        line: c("line"),
        accent: c("accent"),
        "accent-ink": c("accent-ink"),
        rose: c("rose"),
        sage: c("sage"),
        butter: c("butter"),
        lilac: c("lilac"),
        sky: c("sky"),
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "1rem", "2xl": "1.5rem", "3xl": "2rem" },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 24px -8px rgb(var(--shadow) / 0.14)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.08), 0 16px 32px -10px rgb(var(--shadow) / 0.25)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        pop: {
          "0%": { transform: "scale(.94)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: { rise: "rise .45s cubic-bezier(.2,.8,.2,1) both", pop: "pop .25s ease-out both" },
    },
  },
  plugins: [],
};
export default config;
