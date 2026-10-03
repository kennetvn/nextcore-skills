/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    colors: {
      transparent: 'transparent',
      white: '#ffffff',
      background: '#fafaf9',
      foreground: '#1c1917',
      card: 'hsl(var(--card))',
      primary: {
        DEFAULT: '#1d4ed8',
        foreground: '#ffffff',
      },
      brand: {
        50: '#eff6ff',
        900: "#1e3a8a",
      },
    },
    extend: {
      colors: {
        ...require('./extra-colors'),
        muted: { DEFAULT: 'hsl(30 6% 90%)', foreground: 'hsl(25 5% 30%)' },
      },
    },
  },
};
