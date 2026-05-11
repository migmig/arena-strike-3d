import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
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
});
