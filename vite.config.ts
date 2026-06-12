import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 用相对路径产出，方便部署到任意静态托管（含 GitHub Pages 子路径）
      base: mode === 'production' ? './' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          // 多页应用：/ 为视频工具，/bid.html 为标书智能工厂
          input: {
            main: path.resolve(__dirname, 'index.html'),
            bid: path.resolve(__dirname, 'bid.html'),
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // 标书智能工厂（Claude Fable 5）：本地开发可在 .env.local 配 ANTHROPIC_API_KEY
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
