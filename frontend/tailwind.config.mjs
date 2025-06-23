import { join } from "path";

/** @type {import('tailwindcss').Config} */
export default {
  content: [join(__dirname, "src/**/*.{ts,tsx}")],
  theme: {
    extend: {},
  },
  plugins: [],
};
