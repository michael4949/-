import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const standalone = mode === 'standalone';
    return {
      // 用相对路径产出，方便部署到任意静态托管（含 GitHub Pages 子路径）
      base: mode === 'production' ? './' : './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // standalone：把 JS/CSS 全部内联成单个 HTML，可离线、可直接分享
      plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
