/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#FFD966',
          DEFAULT: '#FFC219',
          dark: '#E0A800',
        },
        secondary: {
          light: '#FFF3C4',
          DEFAULT: '#FFD966',
          dark: '#FFC219',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      }
    },
  },
  plugins: [],
}
