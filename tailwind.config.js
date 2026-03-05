/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f2f0eb',
        ink: '#2c2c2c',
        inkMuted: '#5c5c5c',
        border: '#d4d0c8',
      },
      fontFamily: {
        body: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
