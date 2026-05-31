import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand accent — a vivid orange for gym energy
        accent: {
          DEFAULT: "#f97316",
          dark: "#ea6c0a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
