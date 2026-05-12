import type { InputManager } from '@managers/InputManager';

/**
 * Drives the player automatically for perf/memory measurement runs.
 * Strafes left/right on a fixed period, holds FIRE, periodically reloads,
 * and clicks any perk-select card that appears.
 *
 * Only used when `?perf=1` is set; the function is a no-op otherwise.
 */
export function startAutoplay(input: InputManager): () => void {
  const STRAFE_PERIOD_MS = 4000;
  const RELOAD_PERIOD_MS = 3000;

  let strafeRight = true;
  let lastStrafeFlipAt = performance.now();
  let lastReloadAt = performance.now();

  // Hold FIRE permanently.
  input.setVirtual('FIRE', true);
  input.setVirtual('STRAFE_R', true);

  const interval = window.setInterval(() => {
    const now = performance.now();

    if (now - lastStrafeFlipAt >= STRAFE_PERIOD_MS) {
      lastStrafeFlipAt = now;
      strafeRight = !strafeRight;
      input.setVirtual('STRAFE_R', strafeRight);
      input.setVirtual('STRAFE_L', !strafeRight);
    }

    if (now - lastReloadAt >= RELOAD_PERIOD_MS) {
      lastReloadAt = now;
      // Tap reload — only one frame of "triggered" state per call.
      input.setVirtual('RELOAD', true);
      window.setTimeout(() => input.setVirtual('RELOAD', false), 16);
    }

    autoPickPerk();
  }, 100);

  return (): void => {
    window.clearInterval(interval);
    input.setVirtual('FIRE', false);
    input.setVirtual('STRAFE_R', false);
    input.setVirtual('STRAFE_L', false);
  };
}

function autoPickPerk(): void {
  const root = document.getElementById('perk-select');
  if (!root || !root.classList.contains('active')) return;
  const card = root.querySelector('.perk-card') as HTMLElement | null;
  card?.click();
}
