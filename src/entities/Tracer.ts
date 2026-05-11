import { BufferGeometry, Line, LineBasicMaterial, Scene, Vector3, BufferAttribute } from 'three';

const LIFETIME_MS = 60;

interface TracerEntry {
  line: Line;
  diesAt: number;
}

export class TracerPool {
  private pool: TracerEntry[] = [];
  private inUse: TracerEntry[] = [];

  constructor(
    private scene: Scene,
    initial: number,
  ) {
    const mat = new LineBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.85 });
    for (let i = 0; i < initial; i++) {
      const geom = new BufferGeometry();
      geom.setAttribute('position', new BufferAttribute(new Float32Array(6), 3));
      const line = new Line(geom, mat);
      line.visible = false;
      line.frustumCulled = false;
      scene.add(line);
      this.pool.push({ line, diesAt: 0 });
    }
  }

  spawn(from: Vector3, to: Vector3): void {
    const entry = this.pool.pop();
    if (!entry) return;
    const positions = entry.line.geometry.getAttribute('position') as BufferAttribute;
    positions.setXYZ(0, from.x, from.y, from.z);
    positions.setXYZ(1, to.x, to.y, to.z);
    positions.needsUpdate = true;
    entry.line.visible = true;
    entry.diesAt = performance.now() + LIFETIME_MS;
    this.inUse.push(entry);
  }

  update(now: number): void {
    for (let i = this.inUse.length - 1; i >= 0; i--) {
      const entry = this.inUse[i];
      if (!entry) continue;
      if (entry.diesAt <= now) {
        entry.line.visible = false;
        this.pool.push(entry);
        this.inUse.splice(i, 1);
      }
    }
  }
}
