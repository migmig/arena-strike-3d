import { test, expect } from '@playwright/test';

/**
 * M4.7 메모리 누수 검증 (5분 힙 트래킹)
 *
 * Runs the game in `?perf=1` autoplay mode for 5 minutes, sampling
 * `performance.memory.usedJSHeapSize` every 30 seconds.
 *
 * Assertions:
 *   - absolute peak heap stays under 500MB (PRD §11)
 *   - average heap in the second half is ≤ 1.30× the first half average
 *     (i.e. no sustained unbounded growth — transient GC bumps are fine)
 */

const SAMPLE_INTERVAL_MS = 30_000;
const SAMPLE_COUNT = 10; // 30s × 10 = 5 minutes
const WARMUP_MS = 5_000;

interface ChromeMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

test('heap does not grow unboundedly over 5 minutes of autoplay', async ({ page }, testInfo) => {
  testInfo.setTimeout(SAMPLE_INTERVAL_MS * SAMPLE_COUNT + 120_000);

  await page.goto('/?perf=1');

  await page.waitForFunction(() => Boolean(window.__perf), null, { timeout: 30_000 });
  await page.waitForTimeout(WARMUP_MS);

  const samples: number[] = [];

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    await page.waitForTimeout(SAMPLE_INTERVAL_MS);

    const usedBytes = await page.evaluate<number>(() => {
      // Best-effort GC before measuring (only available with --js-flags=--expose-gc).
      const g = (globalThis as unknown as { gc?: () => void }).gc;
      if (typeof g === 'function') g();
      const m = (performance as unknown as { memory?: ChromeMemory }).memory;
      return m ? m.usedJSHeapSize : 0;
    });

    samples.push(usedBytes);
    console.log(`heap sample ${i + 1}/${SAMPLE_COUNT}: ${(usedBytes / 1e6).toFixed(1)} MB`);
  }

  expect(samples.every((b) => b > 0), 'performance.memory should be available in Chromium').toBe(
    true,
  );

  const peakMb = Math.max(...samples) / 1e6;
  expect(peakMb, `peak heap ${peakMb.toFixed(1)}MB exceeds 500MB`).toBeLessThanOrEqual(500);

  const half = Math.floor(samples.length / 2);
  const firstHalfAvg = avg(samples.slice(0, half));
  const secondHalfAvg = avg(samples.slice(half));
  const ratio = secondHalfAvg / firstHalfAvg;

  console.log(
    `heap halves: first=${(firstHalfAvg / 1e6).toFixed(1)}MB, second=${(secondHalfAvg / 1e6).toFixed(1)}MB, ratio=${ratio.toFixed(3)}`,
  );

  expect(ratio, `heap grew ${(ratio * 100 - 100).toFixed(1)}% in 2nd half (> 30%)`).toBeLessThanOrEqual(1.3);
});

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
