/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        tint: "var(--color-tint)",
        card: "var(--color-card)",
        "on-tint": "var(--color-on-tint)",
      },
    },
  },
  plugins: [],
};
