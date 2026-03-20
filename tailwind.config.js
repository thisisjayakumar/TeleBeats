/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          background: "#0F172A",
          primary: "#22C55E",
          text: "#F8FAFC",
          muted: "#94A3B8",
        },
      },
    },
  },
  plugins: [],
};

