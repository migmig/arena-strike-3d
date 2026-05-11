import type { Vector3 } from 'three';
import type { Enemy } from '@entities/Enemy';
import type { Boss } from '@entities/Boss';
import type { PickupSystem } from '@systems/PickupSystem';

const SIZE = 200;
const RENDER_INTERVAL_MS = 100;

export class Minimap {
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastRenderAt = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor(parent: HTMLElement, private worldHalfExtent: number) {
    this.root = document.createElement('div');
    this.root.id = 'minimap-root';
    this.root.innerHTML = `
      <style>
        #minimap-root {
          position: absolute; top: 16px; left: 16px;
          width: ${SIZE}px; height: ${SIZE}px;
          background: rgba(10,10,18,0.55);
          border: 1px solid #555; border-radius: 4px;
          pointer-events: none; overflow: hidden;
        }
        #minimap-root canvas { display: block; width: 100%; height: 100%; }
      </style>
    `;
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE * this.dpr;
    this.canvas.height = SIZE * this.dpr;
    this.root.appendChild(this.canvas);
    parent.appendChild(this.root);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('minimap: 2d context unavailable');
    this.ctx = ctx;
    this.ctx.scale(this.dpr, this.dpr);
  }

  private worldToMap(x: number, z: number, cx: number, cz: number, yaw: number): { mx: number; mz: number } {
    const dx = x - cx;
    const dz = z - cz;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const rx = dx * cos - dz * sin;
    const rz = dx * sin + dz * cos;
    const scale = SIZE / (this.worldHalfExtent * 2);
    return { mx: SIZE / 2 + rx * scale, mz: SIZE / 2 + rz * scale };
  }

  update(
    now: number,
    playerPos: Vector3,
    yaw: number,
    enemies: readonly Enemy[],
    boss: Boss | null,
    pickups: PickupSystem,
  ): void {
    if (now - this.lastRenderAt < RENDER_INTERVAL_MS) return;
    this.lastRenderAt = now;

    const c = this.ctx;
    c.clearRect(0, 0, SIZE, SIZE);

    c.strokeStyle = 'rgba(120,140,180,0.35)';
    c.lineWidth = 1;
    c.strokeRect(2, 2, SIZE - 4, SIZE - 4);

    for (const n of pickups.activeNodes) {
      const { mx, mz } = this.worldToMap(n.pos.x, n.pos.z, playerPos.x, playerPos.z, yaw);
      if (mx < 0 || mx > SIZE || mz < 0 || mz > SIZE) continue;
      c.fillStyle = n.id === 'health' ? '#4dd87a' : n.id.startsWith('ammo') ? '#ffd060' : '#a060ff';
      c.fillRect(mx - 2, mz - 2, 4, 4);
    }

    for (const e of enemies) {
      if (e.isDead) continue;
      const { mx, mz } = this.worldToMap(e.position.x, e.position.z, playerPos.x, playerPos.z, yaw);
      if (mx < 0 || mx > SIZE || mz < 0 || mz > SIZE) continue;
      c.fillStyle = '#ff4040';
      c.beginPath();
      c.arc(mx, mz, 2.5, 0, Math.PI * 2);
      c.fill();
    }

    if (boss && !boss.isDead) {
      const { mx, mz } = this.worldToMap(boss.position.x, boss.position.z, playerPos.x, playerPos.z, yaw);
      c.fillStyle = '#ff2020';
      c.beginPath();
      c.arc(mx, mz, 5, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#fff';
      c.lineWidth = 1;
      c.stroke();
    }

    c.save();
    c.translate(SIZE / 2, SIZE / 2);
    c.fillStyle = '#7ec8ff';
    c.beginPath();
    c.moveTo(0, -6);
    c.lineTo(4, 4);
    c.lineTo(0, 2);
    c.lineTo(-4, 4);
    c.closePath();
    c.fill();
    c.restore();
  }

  destroy(): void {
    this.root.remove();
  }
}
