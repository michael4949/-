/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // §4.4 视觉风格
        bg: '#0F1419',
        card: '#1A1F2E',
        brand: { DEFAULT: '#FF6B35', 600: '#E85820', 50: 'rgba(255,107,53,0.10)' },
        ai: {
          DEFAULT: '#7C3AED',
          border: '#7C3AED',
          bg: 'rgba(124,58,237,0.08)',
          soft: 'rgba(124,58,237,0.16)',
        },
        ok: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        ink: { DEFAULT: '#E5E7EB', dim: '#9CA3AF', faint: '#6B7280' },
        line: { DEFAULT: '#1F2937', soft: '#293040' },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
        ai: '0 0 0 1px #7C3AED, 0 8px 24px rgba(124,58,237,0.25)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
};
