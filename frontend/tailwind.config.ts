import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cl: {
          bg: '#09090B',
          bgSecondary: '#0F0F12',
          surface: '#141418',
          elevated: '#18181C',
          border: '#27272A',
          primary: '#8B5CF6',
          primaryHover: '#7C3AED',
          accent: '#A78BFA',
          success: '#22C55E',
          warning: '#F59E0B',
          critical: '#EF4444',
          info: '#3B82F6',
          text: '#F4F4F5',
          textSecondary: '#A1A1AA',
          muted: '#71717A',
        },
      },
      fontFamily: {
        display: [
          'var(--font-display)',
          'Plus Jakarta Sans',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'cl-card': '0 1px 2px 0 rgba(0, 0, 0, 0.45)',
        'cl-glow':
          '0 0 0 1px rgba(139, 92, 246, 0.35), 0 8px 24px -6px rgba(139, 92, 246, 0.18)',
        'cl-modal':
          '0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(39, 39, 42, 0.9)',
      },
    },
  },
  plugins: [],
};

export default config;
