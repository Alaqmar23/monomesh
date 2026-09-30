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
        background: '#090a0f',
        surface: {
          DEFAULT: '#0f111a',
          hover: '#151824',
          active: '#1c2030',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdbff',
          300: '#8ec3ff',
          400: '#599fff',
          500: '#3077ff',
          600: '#1554f5',
          700: '#0e41e1',
          800: '#1236b6',
          900: '#14318f',
          950: '#101f56',
        },
        accent: {
          cyan: '#00f2fe',
          violet: '#7928ca',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-brand': '0 0 24px -4px rgba(48, 119, 255, 0.35)',
        'glow-cyan': '0 0 24px -4px rgba(0, 242, 254, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
