/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        majestic: {
          50: '#FCF9F2',
          100: '#F7F1E1',
          200: '#EFE2C2',
          300: '#E4CEA0',
          400: '#D5B676',
          500: '#C59E4E',
          600: '#B0883A',
          700: '#8F6C2A',
          800: '#725524',
          900: '#5A431F',
          950: '#32230D',
          gold: '#C59E4E',
          'gold-light': '#EFE2C2',
          'gold-dark': '#8F6C2A',
          charcoal: '#171717',
          obsidian: '#0E0E10',
          cream: '#FDFBF7',
          ivory: '#FAF6EE',
          sand: '#F3EDE0',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        cinzel: ['"Cinzel"', 'serif'],
        script: ['"Great Vibes"', 'cursive'],
        arabic: ['"Amiri"', 'serif'],
        ruqaa: ['"Aref Ruqaa"', 'serif'],
        kufi: ['"Reem Kufi"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
