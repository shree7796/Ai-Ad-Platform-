/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f7ffe6',
          100: '#ebffc2',
          200: '#d7ff8f',
          300: '#bfff52',
          400: '#D4FF5A',
          500: '#A3FF12',
          600: '#7acc00',
          700: '#5c9900',
          800: '#436b05',
          900: '#385709',
        },
        surface: {
          50: '#f2f4f2',
          100: '#e1e5e2',
          200: '#c5cdca',
          300: '#9faeab',
          400: '#758884',
          500: '#566a66',
          600: '#435451',
          700: '#364341',
          800: '#2a3533',
          850: '#1d2524',
          900: '#121915',
          950: '#0B0F0C',
        },
        accent: {
          cyan: '#06b6d4',
          pink: '#ec4899',
          amber: '#f59e0b',
          emerald: '#10b981',
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'glow-pulse': 'glow-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 10px rgba(163,255,18,0.5))' },
          '50%': { opacity: 0.8, filter: 'drop-shadow(0 0 25px rgba(163,255,18,0.8))' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
