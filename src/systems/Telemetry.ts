import type { SaveManager } from '@managers/SaveManager';

export type TelemetryEvent =
  | { type: 'game_start'; difficulty: string; sessionId: string; ts: number }
  | { type: 'wave_complete'; wave: number; timeTakenMs: number; deaths: number; ts: number }
  | { type: 'player_death'; wave: number; weapon: string; kills: number; ts: number }
  | { type: 'weapon_pickup'; weaponId: string; ts: number }
  | { type: 'perk_choice'; offered: string[]; picked: string; ts: number }
  | { type: 'session_end'; durationMs: number; maxWave: number; finalScore: number; ts: number };

const BATCH_INTERVAL_MS = 5000;
const ENDPOINT = (import.meta.env['VITE_TELEMETRY_ENDPOINT'] ?? '') as string;

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class TelemetrySystem {
  readonly sessionId = randomId();
  private queue: TelemetryEvent[] = [];
  private flushTimer: number | null = null;
  private enabled = false;

  constructor(private save: SaveManager) {
    this.enabled = save.telemetryConsent === true;
    if (this.enabled) this.startFlushTimer();
    window.addEventListener('beforeunload', () => this.flush(true));
  }

  setConsent(consent: boolean): void {
    this.save.setTelemetryConsent(consent);
    this.enabled = consent;
    if (consent && this.flushTimer === null) this.startFlushTimer();
  }

  track(event: TelemetryEvent): void {
    if (!this.enabled) return;
    this.queue.push(event);
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => this.flush(false), BATCH_INTERVAL_MS);
  }

  private flush(isUnload: boolean): void {
    if (!this.enabled || this.queue.length === 0 || !ENDPOINT) return;
    const payload = JSON.stringify({ sessionId: this.sessionId, events: this.queue });
    this.queue = [];
    if (isUnload && 'sendBeacon' in navigator) {
      navigator.sendBeacon(ENDPOINT, payload);
    } else {
      void fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    }
  }
}
