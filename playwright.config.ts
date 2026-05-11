import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
  },
  webServer: {
    command: 'pnpm preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
});
