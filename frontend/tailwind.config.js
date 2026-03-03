/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FFFDD0',
          200: '#FFF9C4',
        },
        periwinkle: {
          300: '#C7D2FE',
          400: '#A5B4FC',
          500: '#818CF8',
          600: '#6366F1',
        },
        mint: {
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
        },
        slate: {
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        quicksand: ['Quicksand', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(165, 180, 252, 0.25)',
        'soft-lg': '0 20px 60px -15px rgba(165, 180, 252, 0.35)',
        'mint': '0 10px 40px -10px rgba(110, 231, 183, 0.25)',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      }
    },
  },
  plugins: [],
}
