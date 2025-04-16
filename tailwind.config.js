/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['var(--font-cinzel)'],
      },
      colors: {
        // optional custom theme colors
        team1: '#1E3A8A', // example deep blue
        teamA: '#B91C1C', // example crimson red
        gold: '#FFD700',
      },
    },
  },
  plugins: [],
};
