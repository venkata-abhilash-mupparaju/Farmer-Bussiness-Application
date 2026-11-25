/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        farm: {
          green: '#15803d',
          greenDark: '#166534',
          greenLight: '#dcfce7',
          gold: '#b45309',
          goldLight: '#fef3c7',
          brown: '#78350f',
          red: '#b91c1c',
          redLight: '#fee2e2',
          blue: '#1d4ed8',
          blueLight: '#dbeafe',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
