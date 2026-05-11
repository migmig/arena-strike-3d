import { Vector3, type PerspectiveCamera } from 'three';
import type { Enemy } from '@entities/Enemy';

interface Entry {
  enemy: Enemy;
  wrap: HTMLDivElement;
  fill: HTMLDivElement;
  lastHpRatio: number;
}

const POOL_SIZE = 40;

export class EnemyHpBars {
  private root: HTMLDivElement;
  private pool: HTMLDivElement[] = [];
  private active = new Map<Enemy, Entry>();
  private worldPos = new Vector3();

  constructor(
    parent: HTMLElement,
    private camera: PerspectiveCamera,
  ) {
    this.root = document.createElement('div');
    this.root.innerHTML = `
      <style>
        .enemy-hp {
          position: absolute; width: 60px; height: 6px;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 2px; overflow: hidden; pointer-events: none;
          opacity: 0; transition: opacity 0.2s;
        }
        .enemy-hp.visible { opacity: 1; }
        .enemy-hp-fill {
          width: 100%; height: 100%;
          background: linear-gradient(90deg, #ff7050, #c03030);
          transform-origin: 0 0;
        }
      </style>
    `;
    this.root.style.position = 'absolute';
    this.root.style.inset = '0';
    this.root.style.pointerEvents = 'none';
    parent.appendChild(this.root);
    for (let i = 0; i < POOL_SIZE; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'enemy-hp';
      const fill = document.createElement('div');
      fill.className = 'enemy-hp-fill';
      wrap.appendChild(fill);
      wrap.style.display = 'none';
      this.root.appendChild(wrap);
      this.pool.push(wrap);
    }
  }

  private acquire(enemy: Enemy): Entry | null {
    const wrap = this.pool.pop();
    if (!wrap) return null;
    const fill = wrap.firstElementChild as HTMLDivElement;
    wrap.style.display = 'block';
    const entry: Entry = { enemy, wrap, fill, lastHpRatio: 1 };
    this.active.set(enemy, entry);
    return entry;
  }

  private release(entry: Entry): void {
    entry.wrap.style.display = 'none';
    entry.wrap.classList.remove('visible');
    this.pool.push(entry.wrap);
    this.active.delete(entry.enemy);
  }

  update(enemies: readonly Enemy[], screenW: number, screenH: number): void {
    const alive = new Set(enemies);
    for (const [enemy, entry] of this.active) {
      if (!alive.has(enemy) || enemy.isDead) this.release(entry);
    }
    for (const enemy of enemies) {
      const ratio = enemy.hp / enemy.maxHp;
      if (ratio >= 1) {
        const existing = this.active.get(enemy);
        if (existing) this.release(existing);
        continue;
      }
      let entry = this.active.get(enemy);
      if (!entry) {
        const got = this.acquire(enemy);
        if (!got) continue;
        entry = got;
      }
      this.worldPos.copy(enemy.position);
      this.worldPos.y += enemy.visualHeight + 0.3;
      this.worldPos.project(this.camera);
      if (this.worldPos.z < -1 || this.worldPos.z > 1) {
        entry.wrap.classList.remove('visible');
        continue;
      }
      const x = (this.worldPos.x * 0.5 + 0.5) * screenW;
      const y = (-this.worldPos.y * 0.5 + 0.5) * screenH;
      entry.wrap.style.left = `${x}px`;
      entry.wrap.style.top = `${y}px`;
      entry.wrap.classList.add('visible');
      if (Math.abs(ratio - entry.lastHpRatio) > 0.01) {
        entry.fill.style.transform = `scaleX(${Math.max(0, ratio)})`;
        entry.lastHpRatio = ratio;
      }
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
