import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 单文件构建：把 JS / CSS / 数据全部内联进一个 HTML，可用 file:// 或 U 盘离线打开。
export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  base: './',
  build: { outDir: 'dist-single', emptyOutDir: true, cssCodeSplit: false, assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 5000, reportCompressedSize: false },
});
