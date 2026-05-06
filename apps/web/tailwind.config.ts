import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens ported from mockups/style-v2.css
        sidebar: {
          bg: '#0f172a',
          hover: '#1e293b',
          active: '#1e3a5f',
          text: '#94a3b8',
          'text-active': '#f1f5f9',
          border: '#1e293b',
        },
        surface: {
          DEFAULT: '#1e293b',
          raised: '#253346',
          sunken: '#0f172a',
        },
        brand: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          light: '#60a5fa',
        },
        status: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
