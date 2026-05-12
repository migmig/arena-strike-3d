/**
 * Performance instrumentation that is only active when `?perf=1` is in the URL.
 * Production / normal play paths do not import or trigger any of this code path
 * unless explicitly enabled.
 */

export interface PerfSnapshot {
  frametimes: number[];
  waveTimings: number[];
  startedAt: number;
  frames: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    __perf?: PerfSnapshot;
  }
}

const MAX_SAMPLES = 60 * 60 * 10; // ~10 minutes at 60fps cap to avoid unbounded growth

let enabled = false;

export function isPerfEnabled(): boolean {
  return enabled;
}

export function enablePerf(): PerfSnapshot {
  enabled = true;
  const snap: PerfSnapshot = {
    frametimes: [],
    waveTimings: [],
    startedAt: performance.now(),
    frames: 0,
  };
  window.__perf = snap;
  return snap;
}

export function recordFrame(deltaMs: number): void {
  if (!enabled) return;
  const snap = window.__perf;
  if (!snap) return;
  if (snap.frametimes.length >= MAX_SAMPLES) snap.frametimes.shift();
  snap.frametimes.push(deltaMs);
  snap.frames += 1;
}

export function recordWave(timeTakenMs: number): void {
  if (!enabled) return;
  const snap = window.__perf;
  if (!snap) return;
  snap.waveTimings.push(timeTakenMs);
}

export function shouldEnableFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('perf') === '1';
}
