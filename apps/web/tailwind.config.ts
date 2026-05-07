import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sidebar
        sidebar: {
          bg: '#0b0e1a',
          hover: 'rgba(255,255,255,0.05)',
          active: 'rgba(245,127,32,0.12)',
          text: '#8892a4',
          'text-active': '#f1f5f9',
          border: '#1a1f2e',
        },
        // Surfaces
        surface: {
          DEFAULT: '#141926',
          raised: '#1c2232',
          sunken: '#0b0e1a',
        },
        // Brand — Access Bank-inspired orange
        brand: {
          DEFAULT: '#f57f20',
          hover: '#d46a1a',
          light: 'rgba(245,127,32,0.12)',
          dim: 'rgba(245,127,32,0.06)',
        },
        // Accent colours
        accent: {
          blue:  '#376cc6',
          green: '#8aac11',
          indigo: '#4f46e5',
        },
        // Status
        status: {
          critical: '#ef4444',
          high:     '#f97316',
          medium:   '#eab308',
          low:      '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'count-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'count-up':      'count-up 0.4s ease-out both',
        'fade-in':       'fade-in 0.3s ease-out both',
        'slide-in-left': 'slide-in-left 0.25s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
