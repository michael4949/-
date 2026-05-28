import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const standalone = mode === 'standalone';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        ...(standalone
          ? [
              // Strip the CDN importmap so React / d3-geo / topojson-client
              // get bundled from node_modules into the single output file.
              {
                name: 'strip-importmap',
                transformIndexHtml(html: string) {
                  return html.replace(/<script type="importmap">[\s\S]*?<\/script>/g, '');
                },
              },
              viteSingleFile({ removeViteModuleLoader: true }),
            ]
          : []),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: standalone
        ? {
            outDir: 'dist-standalone',
            assetsInlineLimit: 100_000_000,
            chunkSizeWarningLimit: 100_000_000,
            cssCodeSplit: false,
            rollupOptions: { output: { inlineDynamicImports: true } },
            target: 'esnext',
          }
        : undefined,
    };
});
