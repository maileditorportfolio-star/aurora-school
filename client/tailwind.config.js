/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './store/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        signal: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        frost: '#f6f9f8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(13 148 136 / 0.2)',
        glow: '0 0 0 1px rgb(20 184 166 / 0.18), 0 12px 40px -12px rgb(15 118 110 / 0.45)',
        card: '0 24px 60px -30px rgb(15 23 42 / 0.35)',
        lift: '0 30px 80px -40px rgb(2 6 23 / 0.5)',
      },
      backgroundImage: {
        'grid-brand':
          'linear-gradient(to right, rgb(20 184 166 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(20 184 166 / 0.08) 1px, transparent 1px)',
        'grid-fine':
          'linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)',
        aurora:
          'radial-gradient(60% 60% at 15% 10%, rgb(20 184 166 / 0.32) 0%, transparent 60%), radial-gradient(50% 50% at 85% 0%, rgb(252 211 77 / 0.25) 0%, transparent 60%), radial-gradient(60% 60% at 50% 100%, rgb(17 94 89 / 0.28) 0%, transparent 60%)',
        'aurora-deep':
          'radial-gradient(55% 55% at 12% 8%, rgb(13 148 136 / 0.5) 0%, transparent 62%), radial-gradient(45% 45% at 88% 2%, rgb(252 211 77 / 0.3) 0%, transparent 64%), radial-gradient(60% 60% at 55% 105%, rgb(17 94 89 / 0.38) 0%, transparent 62%), radial-gradient(40% 40% at 70% 45%, rgb(94 234 212 / 0.09) 0%, transparent 60%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        marquee: 'marquee 28s linear infinite',
        'marquee-slow': 'marquee 44s linear infinite',
        shimmer: 'shimmer 2.2s linear infinite',
      },
    },
  },
  plugins: [],
};
