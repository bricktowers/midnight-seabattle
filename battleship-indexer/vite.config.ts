import { defineConfig } from 'vite';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { builtinModules } from 'module';
import path from 'path';

export default defineConfig({
  cacheDir: './.vite',
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'bundle',
    },
    outDir: 'dist',
    target: 'node20',
    rollupOptions: {
      external: [
        'ws',
        'firebase-admin',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
  },
  plugins: [wasm(), viteCommonjs(), topLevelAwait()],
  optimizeDeps: {
    esbuildOptions: {
      target: 'node20',
      platform: 'node',
    },
  },
  define: {},
  resolve: {
    alias: {
      'isomorphic-ws': path.resolve(__dirname, './shims/ws-shim.js'),
    },
  },
});
