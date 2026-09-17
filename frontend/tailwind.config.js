/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Souqly brand colors
        primary: {
          DEFAULT: '#FF6B35',
          50: '#FFF2ED',
          100: '#FFE4D6',
          200: '#FFC9AD',
          500: '#FF6B35',
          600: '#E55A25',
          700: '#CC4A15',
        },
        dark: '#1A1A2E',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
