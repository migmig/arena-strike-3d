import { Vector3, type PerspectiveCamera } from 'three';

interface Entry {
  el: HTMLDivElement;
  worldPos: Vector3;
  diesAt: number;
}

const LIFETIME_MS = 800;
const POOL_SIZE = 32;

export class DamageNumbers {
  private root: HTMLDivElement;
  private pool: HTMLDivElement[] = [];
  private active: Entry[] = [];

  constructor(
    parent: HTMLElement,
    private camera: PerspectiveCamera,
  ) {
    this.root = document.createElement('div');
    this.root.innerHTML = `
      <style>
        .dmg-num {
          position: absolute; transform: translate(-50%, -50%);
          font-family: system-ui, sans-serif; font-weight: 700;
          pointer-events: none; text-shadow: 0 2px 4px rgba(0,0,0,0.9);
          font-size: 18px; color: #fff;
        }
        .dmg-num.crit { color: #ffd060; font-size: 26px; }
      </style>
    `;
    this.root.style.position = 'absolute';
    this.root.style.inset = '0';
    this.root.style.pointerEvents = 'none';
    parent.appendChild(this.root);
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'dmg-num';
      el.style.display = 'none';
      this.root.appendChild(el);
      this.pool.push(el);
    }
  }

  spawn(worldPos: Vector3, amount: number, isCrit: boolean): void {
    const el = this.pool.pop();
    if (!el) return;
    el.textContent = String(Math.round(amount));
    el.classList.toggle('crit', isCrit);
    el.style.display = 'block';
    this.active.push({ el, worldPos: worldPos.clone(), diesAt: performance.now() + LIFETIME_MS });
  }

  update(now: number, screenW: number, screenH: number): void {
    const v = new Vector3();
    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i];
      if (!entry) continue;
      const t = 1 - (entry.diesAt - now) / LIFETIME_MS;
      v.copy(entry.worldPos);
      v.y += t * 1.0;
      v.project(this.camera);
      const x = (v.x * 0.5 + 0.5) * screenW;
      const y = (-v.y * 0.5 + 0.5) * screenH;
      entry.el.style.left = `${x}px`;
      entry.el.style.top = `${y}px`;
      entry.el.style.opacity = String(Math.max(0, 1 - t));
      if (entry.diesAt <= now) {
        entry.el.style.display = 'none';
        this.pool.push(entry.el);
        this.active.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
