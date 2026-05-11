import type { SaveManager } from '@managers/SaveManager';

interface Hint {
  id: 'controls' | 'fire' | 'reload';
  text: string;
  showAfterMs: number;
  durationMs: number;
}

const HINTS: Hint[] = [
  { id: 'controls', text: 'WASD · Space · Shift · Mouse · LMB', showAfterMs: 500, durationMs: 5000 },
  { id: 'fire', text: 'LMB to fire', showAfterMs: 0, durationMs: 3000 },
  { id: 'reload', text: 'R to reload', showAfterMs: 0, durationMs: 3000 },
];

export class Onboarding {
  private root: HTMLDivElement;
  private startedAt = performance.now();
  private shown = new Set<Hint['id']>();
  private active: { hint: Hint; until: number } | null = null;

  constructor(
    parent: HTMLElement,
    private save: SaveManager,
  ) {
    this.root = document.createElement('div');
    this.root.innerHTML = `
      <style>
        #onboarding {
          position: absolute; left: 50%; top: 30%; transform: translate(-50%, 0);
          font-family: system-ui, sans-serif; font-size: 20px; color: #fff;
          text-shadow: 0 2px 6px rgba(0,0,0,0.9); pointer-events: none;
          opacity: 0; transition: opacity 0.4s;
        }
        #onboarding.active { opacity: 1; }
      </style>
      <div id="onboarding"></div>
    `;
    parent.appendChild(this.root);
  }

  trigger(id: Hint['id']): void {
    if (this.save.tutorialSeen) return;
    if (this.shown.has(id)) return;
    const hint = HINTS.find((h) => h.id === id);
    if (!hint) return;
    this.shown.add(id);
    setTimeout(() => this.display(hint), hint.showAfterMs);
  }

  private display(hint: Hint): void {
    const el = this.root.querySelector('#onboarding') as HTMLDivElement;
    el.textContent = hint.text;
    el.classList.add('active');
    this.active = { hint, until: performance.now() + hint.durationMs };
  }

  update(now: number): void {
    if (this.save.tutorialSeen) return;
    if (now - this.startedAt > 500) this.trigger('controls');
    if (this.active && now >= this.active.until) {
      const el = this.root.querySelector('#onboarding') as HTMLDivElement;
      el.classList.remove('active');
      this.active = null;
      if (this.shown.size >= 3) this.save.markTutorialSeen();
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
