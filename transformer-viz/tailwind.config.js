/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          dark: {
            bg: '#0a0a0a',
            card: '#111111',
            border: '#222222',
            hover: '#1a1a1a',
          }
        }
      },
    },
    plugins: [],
  }