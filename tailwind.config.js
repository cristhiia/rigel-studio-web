/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rigel-ivory': '#F8FAFC',
        'rigel-night': '#001a33',
        'rigel-steel': '#D4AF37',
      },
      fontFamily: {
        'display': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
