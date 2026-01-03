/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Microsoft Cloud for Sustainability Color Palette
        // Primary Blue (Microsoft Blue)
        azure: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0078D4', // Microsoft Blue
          600: '#106EBE',
          700: '#005A9E',
          800: '#004578',
          900: '#003052',
        },
        // Sustainability Green
        sustain: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#107C10', // Microsoft Green
          600: '#0B5C0B',
          700: '#094509',
          800: '#073507',
          900: '#052505',
        },
        // Teal for sustainability
        eco: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00A36C', // Sustainability Teal
          600: '#008F5D',
          700: '#007A4E',
          800: '#00653F',
          900: '#005030',
        },
        // Keep grass for backward compatibility
        grass: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Meadow accent colors
        meadow: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Nature-inspired neutrals - Updated for Microsoft style
        earth: {
          50: '#FAF9F8',  // Microsoft Fluent Background
          100: '#F3F2F1',
          200: '#E1DFDD',
          300: '#C8C6C4',
          400: '#A19F9D',
          500: '#605E5C',
          600: '#484644',
          700: '#323130',
          800: '#252423',
          900: '#1B1A19',
        },
        // Semantic colors - Microsoft style
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0078D4',
          600: '#106EBE',
          700: '#005A9E',
          800: '#004578',
          900: '#003052',
        },
        success: {
          50: '#f0fdf4',
          500: '#107C10',
          600: '#0B5C0B',
        },
        warning: {
          50: '#fff7ed',
          500: '#F7630C',
          600: '#D25A08',
        },
        error: {
          50: '#fef2f2',
          500: '#D13438',
          600: '#A4262C',
        },
        info: {
          50: '#eff6ff',
          500: '#0078D4',
          600: '#106EBE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'grass': '0 4px 14px 0 rgba(34, 197, 94, 0.15)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      backgroundImage: {
        'gradient-grass': 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
        'gradient-meadow': 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        'gradient-forest': 'linear-gradient(180deg, #14532d 0%, #166534 100%)',
      },
    },
  },
  plugins: [],
};
