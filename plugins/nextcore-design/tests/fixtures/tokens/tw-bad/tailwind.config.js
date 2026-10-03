// Tailwind v3 config — see https://tailwindcss.com/docs/configuration
const colors = require('tailwindcss/colors');

module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        gray: colors.gray, // not a literal: skipped
        background: '#ffffff',
        foreground: '#9ca3af', /* too light for body text */
        primary: {
          DEFAULT: '#facc15',
          foreground: '#ffffff',
        },
      },
    },
  },
};
