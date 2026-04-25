/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bordo: {
          deep:  '#2D0A10',
          dark:  '#4A1019',
          DEFAULT:'#6B1A2A',
          light: '#8B2438',
        },
        gold: {
          pale:  '#F5E9C8',
          light: '#E0C06A',
          DEFAULT:'#C9A84C',
        },
        surface: {
          1: '#1C0A0F',
          2: '#241018',
          3: '#2E1520',
          4: '#3A1D28',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
