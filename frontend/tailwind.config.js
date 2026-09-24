/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f6fc',
          100: '#e1ecf8',
          500: '#1e5a96',
          700: '#123b64',
          800: '#0c2642',
          900: '#07182b',
        },
        slate: {
          850: '#15202e',
          900: '#0f172a',
          950: '#090e17'
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
