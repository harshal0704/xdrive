/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./index.html"],
  theme: {
    extend: {
      colors: {
        'neon-pink': '#ff007f',
        'neon-yellow': '#ccff00',
        'dark-violet': '#120024',
        'cyber-black': '#0a0a0a'
      },
      fontFamily: {
        'mono': ['"Courier New"', 'Courier', 'monospace'],
        'sans': ['system-ui', 'sans-serif']
      }
    }
  },
  plugins: [],
}
