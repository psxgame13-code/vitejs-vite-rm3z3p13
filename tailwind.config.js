/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c2430',
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b7d0ff',
          300: '#85b0ff',
          400: '#4d86ff',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
        focus: '#0f766e',
        regulate: '#b45309',
        emotion: '#7c3aed',
        digital: '#0369a1',
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -18px rgba(23, 37, 84, 0.45)',
      },
    },
  },
  plugins: [],
}