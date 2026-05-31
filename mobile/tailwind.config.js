const nativewind = require("nativewind/preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [nativewind],
  theme: {
    extend: {
      fontFamily: {
        newsreader: ["Newsreader-Regular"],
        "newsreader-bold": ["Newsreader-Bold"],
      },
      fontSize: {
        "32": "32px",
      },
    },
  },
  plugins: [],
}