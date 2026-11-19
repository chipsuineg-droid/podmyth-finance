/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: '#C62828',
          dark: '#B71C1C',
          light: '#EF9A9A',
        },
        jet: '#111111',
        surface: '#F8F9FA',
        border: '#E5E5E5',
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontVariantNumeric: ['tabular-nums'],
    },
  },
  plugins: [],
}
