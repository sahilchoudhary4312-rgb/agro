/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9f1",
          100: "#dcefe0",
          200: "#bbe0c4",
          300: "#8cca9f",
          400: "#57ad74",
          500: "#349155",
          600: "#237443",
          700: "#1c5d37",
          800: "#174a2e",
          900: "#123c26",
        },
        leaf: {
          50: "#f2fbf4",
          100: "#e0f6e5",
          200: "#c3ecd0",
          300: "#95dbab",
          400: "#61c27f",
          500: "#3da65e",
          600: "#2c8749",
          700: "#256b3c",
          800: "#205532",
          900: "#1b462b",
        },
        accent: {
          50: "#fffaeb",
          100: "#fef0c7",
          200: "#fee08a",
          300: "#fdca4d",
          400: "#fcb520",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        surface: "#f7f8f6",
        ink: {
          DEFAULT: "#1f2937",
          soft: "#4b5563",
          mute: "#6b7280",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans",
          "Noto Sans Devanagari",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)",
        pop: "0 8px 24px rgba(16,24,40,.12)",
      },
    },
  },
  plugins: [],
};
