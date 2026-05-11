import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
} from 'three';

const PARTICLE_COUNT = 80;
const LIFETIME = 0.4;

export class HitParticles {
  private points: Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private ages: Float32Array;
  private active = 0;

  constructor(private scene: Scene) {
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.velocities = new Float32Array(PARTICLE_COUNT * 3);
    this.ages = new Float32Array(PARTICLE_COUNT);
    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    const mat = new PointsMaterial({
      color: 0xff8050,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.points = new Points(geom, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < PARTICLE_COUNT; i++) this.ages[i] = LIFETIME;
  }

  burst(pos: Vector3, count = 12): void {
    for (let n = 0; n < count; n++) {
      const idx = this.active % PARTICLE_COUNT;
      const i3 = idx * 3;
      this.positions[i3] = pos.x;
      this.positions[i3 + 1] = pos.y;
      this.positions[i3 + 2] = pos.z;
      this.velocities[i3] = (Math.random() - 0.5) * 4;
      this.velocities[i3 + 1] = Math.random() * 3 + 1;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 4;
      this.ages[idx] = 0;
      this.active++;
    }
  }

  update(deltaTime: number): void {
    let anyActive = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const age = this.ages[i];
      if (age === undefined || age >= LIFETIME) continue;
      anyActive = true;
      const i3 = i * 3;
      const vy = (this.velocities[i3 + 1] ?? 0) - 9.8 * deltaTime;
      this.velocities[i3 + 1] = vy;
      this.positions[i3] = (this.positions[i3] ?? 0) + (this.velocities[i3] ?? 0) * deltaTime;
      this.positions[i3 + 1] = (this.positions[i3 + 1] ?? 0) + vy * deltaTime;
      this.positions[i3 + 2] =
        (this.positions[i3 + 2] ?? 0) + (this.velocities[i3 + 2] ?? 0) * deltaTime;
      this.ages[i] = age + deltaTime;
    }
    if (anyActive) {
      const attr = this.points.geometry.getAttribute('position') as Float32BufferAttribute;
      attr.needsUpdate = true;
    }
  }

  destroy(): void {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as PointsMaterial).dispose();
  }
}
