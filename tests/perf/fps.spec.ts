import { test, expect } from '@playwright/test';

/**
 * M4.8 60fps 안정성 측정 — regression guard
 *
 * Boots the game in `?perf=1` autoplay mode, runs ~60s, and reads the
 * frametime buffer from `window.__perf`.
 *
 * Note: PRD §14's "≥ 55fps avg" KPI is a real-device target (verified via
 * telemetry / manual QA). Headless Chromium uses a software rasterizer
 * without vsync, so its ceiling sits near ~50fps even on idle workloads.
 * This spec enforces headless-appropriate floors to catch regressions —
 * if the autoplay loop drops below these, something has gotten meaningfully
 * slower:
 *   - average FPS ≥ 40
 *   - p95 frametime ≤ 40ms
 */

const MEASURE_MS = 60_000;
const WARMUP_MS = 3_000;
const HEADLESS_FPS_FLOOR = 40;
const HEADLESS_P95_CEILING_MS = 40;

test('FPS stays at headless floor avg ≥ 40 and p95 frametime ≤ 40ms over 60s', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(MEASURE_MS + 60_000);

  await page.goto('/?perf=1');

  // Wait for the game to boot and start the autoplay loop.
  await page.waitForFunction(() => Boolean(window.__perf), null, { timeout: 30_000 });
  await page.waitForTimeout(WARMUP_MS);

  // Reset the frametime buffer post-warmup so init-time GC stalls don't count.
  await page.evaluate(() => {
    if (window.__perf) window.__perf.frametimes.length = 0;
  });

  await page.waitForTimeout(MEASURE_MS);

  const samples = await page.evaluate<number[]>(() =>
    window.__perf ? [...window.__perf.frametimes] : [],
  );

  expect(samples.length).toBeGreaterThan(60 * 30); // at least 30fps × 60s collected

  const sum = samples.reduce((a, b) => a + b, 0);
  const avgFrameMs = sum / samples.length;
  const avgFps = 1000 / avgFrameMs;

  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

  console.log(
    `FPS: avg=${avgFps.toFixed(1)} (${avgFrameMs.toFixed(2)}ms), p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms, n=${samples.length}`,
  );

  expect(avgFps).toBeGreaterThanOrEqual(HEADLESS_FPS_FLOOR);
  expect(p95).toBeLessThanOrEqual(HEADLESS_P95_CEILING_MS);
});
