import { defineConfig } from '@playwright/test';

/**
 * Separate config for performance / memory perf measurement specs.
 * Run with: `pnpm test:perf`. Not part of the default CI pipeline.
 *
 * - Single worker, no retries → deterministic timing.
 * - Long per-test timeout to allow the 5-minute heap soak.
 * - Chromium only — uses `performance.memory` which is Chrome-specific.
 * - Enables `--js-flags=--expose-gc` so memory specs can force GC before sampling.
 */
export default defineConfig({
  testDir: 'tests/perf',
  timeout: 8 * 60 * 1000, // 8 min — covers the 5-min soak + setup overhead
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    launchOptions: {
      args: ['--js-flags=--expose-gc'],
    },
  },
  webServer: {
    command: 'pnpm preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
});
