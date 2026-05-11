import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Scene,
  Vector3,
} from 'three';

interface Fragment {
  pos: Vector3;
  vel: Vector3;
  rot: Vector3;
  rotVel: Vector3;
  scale: number;
  age: number;
  life: number;
  color: number;
}

const MAX_FRAGMENTS = 240;
const GRAVITY = 14;

export class DeathFragments {
  private mesh: InstancedMesh;
  private material: MeshStandardMaterial;
  private active: Fragment[] = [];
  private dummy = new Object3D();
  private matrix = new Matrix4();

  constructor(private scene: Scene) {
    const geom = new BoxGeometry(1, 1, 1);
    this.material = new MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      roughness: 0.6,
    });
    this.mesh = new InstancedMesh(geom, this.material, MAX_FRAGMENTS);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  burst(origin: Vector3, color: number, count = 14): void {
    for (let n = 0; n < count; n++) {
      if (this.active.length >= MAX_FRAGMENTS) return;
      this.active.push({
        pos: origin.clone(),
        vel: new Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 6 + 1,
          (Math.random() - 0.5) * 6,
        ),
        rot: new Vector3(),
        rotVel: new Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ),
        scale: 0.15 + Math.random() * 0.2,
        age: 0,
        life: 1.0 + Math.random() * 0.4,
        color,
      });
    }
  }

  update(deltaTime: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const f = this.active[i];
      if (!f) continue;
      f.age += deltaTime;
      if (f.age >= f.life) {
        this.active.splice(i, 1);
        continue;
      }
      f.vel.y -= GRAVITY * deltaTime;
      f.pos.x += f.vel.x * deltaTime;
      f.pos.y += f.vel.y * deltaTime;
      f.pos.z += f.vel.z * deltaTime;
      if (f.pos.y < 0.05) {
        f.pos.y = 0.05;
        f.vel.y *= -0.4;
        f.vel.x *= 0.7;
        f.vel.z *= 0.7;
      }
      f.rot.x += f.rotVel.x * deltaTime;
      f.rot.y += f.rotVel.y * deltaTime;
      f.rot.z += f.rotVel.z * deltaTime;
    }
    this.mesh.count = this.active.length;
    for (let i = 0; i < this.active.length; i++) {
      const f = this.active[i] as Fragment;
      const t = 1 - f.age / f.life;
      const s = f.scale * t;
      this.dummy.position.copy(f.pos);
      this.dummy.rotation.set(f.rot.x, f.rot.y, f.rot.z);
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.matrix.copy(this.dummy.matrix);
      this.mesh.setMatrixAt(i, this.matrix);
      this.mesh.setColorAt(i, this.tmpColorFor(f));
    }
    if (this.active.length > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  private tmpColor = new Color();
  private tmpColorFor(f: Fragment): Color {
    return this.tmpColor.setHex(f.color);
  }
}
