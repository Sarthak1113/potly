/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#6419D6',
          'purple-dark': '#4710A8',
          lavender: '#A78BFA',
          gold: '#FFB51B',
          orange: '#FF762B',
        },
        surface: {
          midnight: '#17102D',
          elevated: '#21183A',
          card: '#1E1535',
          light: '#F7F5FC',
          white: '#FFFFFF',
        },
        potly: {
          border: '#3B3152',
          'border-subtle': '#4C3F6B',
          muted: '#C4BBD5',
          text: '#F7F5FC',
        },
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#6419D6',
          700: '#4710A8',
          800: '#340b7d',
          900: '#230656',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Space Grotesk', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'card': '18px',
        'panel': '22px',
        'control': '12px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.28)',
        'elevated': '0 12px 36px rgba(15, 10, 30, 0.45)',
        'brand': '0 8px 25px rgba(100, 25, 214, 0.35)',
        'gold': '0 8px 25px rgba(255, 181, 27, 0.35)',
        'orange': '0 8px 25px rgba(255, 118, 43, 0.35)',
      }
    }
  },
  plugins: [],
}
