/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'osssc-blue': '#1e3a8a',
        'osssc-gray': '#f3f4f6',
      }
    },
  },
  plugins: [],
}
