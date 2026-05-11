import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@managers': resolve(__dirname, 'src/managers'),
      '@systems': resolve(__dirname, 'src/systems'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@data': resolve(__dirname, 'src/data'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          rapier: ['@dimforge/rapier3d-compat'],
        },
      },
    },
  },
});
