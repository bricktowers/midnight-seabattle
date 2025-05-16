import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: './.vite',
  build: {
    target: 'esnext',
    minify: false,
  },
  plugins: [wasm(), react(), viteCommonjs(), topLevelAwait()],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  define: {},
});
