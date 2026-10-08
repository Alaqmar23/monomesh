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
        background: '#1a1210',
        ink: {
          950: '#140d0c',
          900: '#1a1210',
          800: '#231815',
          700: '#2d1f1c',
          600: '#3a2824',
        },
        cream: {
          50: '#fffcf9',
          100: '#fff8f1',
          200: '#fbeee6',
          300: '#edd8cc',
        },
        coral: {
          400: '#ff7767',
          500: '#f0604f',
          600: '#d94d3d',
          700: '#be392b',
        },
        mono: {
          bg: '#1a1210',
          surface: '#231815',
          fg: '#fff8f1',
          muted: '#a89289',
          ac: '#f0604f',
          border: '#352521',
          borderHover: '#4d3731',
        },
      },
      fontFamily: {
        serif: ['"Fraunces"', 'serif'],
        display: ['"Fraunces"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        wordmark: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'btn': '0 2px 0 #b5382a',
        'btn-hover': '0 3px 0 #b5382a',
        'btn-dark': '0 2px 0 #140d0c',
        'panel': '0 12px 32px -8px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'crisp': '6px',
      }
    },
  },
  plugins: [],
}
