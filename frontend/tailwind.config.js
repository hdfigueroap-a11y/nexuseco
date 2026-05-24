/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        eco: {
          50:  '#f0fdf6',
          100: '#dcfcec',
          200: '#bbf7d6',
          300: '#86efb4',
          400: '#4ade80',
          500: '#22c55e',
          600: '#009B4D',
          700: '#007a3d',
          800: '#005c2e',
          900: '#003d1f',
        },
        mandarina: {
          50:  '#fffef0',
          100: '#fffcd6',
          200: '#fff8a8',
          300: '#fff170',
          400: '#FFCC00',
          500: '#e6b800',
          600: '#cc9f00',
          700: '#a37d00',
          800: '#7a5d00',
          900: '#523e00',
        },
        marfil: {
          DEFAULT: '#FAF5E9',
          50:  '#FAF5E9',
          100: '#f5ecd4',
          200: '#ecdbb0',
          300: '#e0c47e',
          400: '#d4ad52',
          500: '#c49535',
        },
      },
    },
  },
  plugins: [],
};
