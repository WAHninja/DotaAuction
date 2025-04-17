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
        // Base
        background: '#1d1d1d',
        surface: '#2f2f2f',
        hud: '#4b4b4b',
        cooldown: '#5a5a5a',
        text: {
          DEFAULT: '#e0e0e0',
          muted: '#aaaaaa',
        },

        // Radiant / Dire
        radiant: {
          green: '#86b75f',
          light: '#6c995c',
        },
        dire: {
          red: '#a33a3a',
          dark: '#8b2f2f',
        },

        // UI Elements
        health: '#00ff00',
        mana: '#0000ff',
        arcana: '#2f22ff',
        gold: '#d5c077',
        goldDark: '#b29a5b',
        purple: '#673a67',

        // Status
        winner: '#86b75f',
        loser: '#a33a3a',
        pending: '#2f22ff',
      },
      borderRadius: {
        lg: '12px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        arcana: '0 0 10px #2f22ff',
        radiant: '0 0 10px #86b75f',
        dire: '0 0 10px #a33a3a',
        gold: '0 0 10px #d5c077',
      },
    },
  },
  plugins: [],
}
