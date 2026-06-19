/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 浅色配色（江铜橙 + AI 紫保持不变）
        bg: '#F5F7FA',           // 页面浅灰背景
        card: '#FFFFFF',         // 卡片纯白
        panel2: '#FAFBFC',       // 次面板
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
        ink: { DEFAULT: '#1F2937', dim: '#5B6573', faint: '#9CA3AF' },
        line: { DEFAULT: '#E5E7EB', soft: '#D1D5DB' },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,24,39,.04), 0 4px 12px rgba(17,24,39,.06)',
        ai: '0 0 0 1px #7C3AED, 0 8px 24px rgba(124,58,237,0.25)',
        fab: '0 10px 30px rgba(124,58,237,0.30)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
};
