import {
  Scene,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Vector3,
  Box3,
  PointLight,
} from 'three';

interface Projectile {
  mesh: Mesh;
  light: PointLight;
  velocity: Vector3;
  damage: number;
  diesAt: number;
  active: boolean;
}

const POOL_SIZE = 32;
const PROJECTILE_SPEED = 18;
const LIFETIME_MS = 2500;
const HIT_RADIUS = 0.45;

export class ProjectileSystem {
  private pool: Projectile[] = [];
  private playerBox = new Box3();

  constructor(private scene: Scene) {
    const geom = new SphereGeometry(0.18, 8, 8);
    const mat = new MeshBasicMaterial({ color: 0xffb040 });
    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new Mesh(geom, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      const light = new PointLight(0xffb040, 1.0, 3);
      light.visible = false;
      scene.add(light);
      this.pool.push({
        mesh,
        light,
        velocity: new Vector3(),
        damage: 0,
        diesAt: 0,
        active: false,
      });
    }
  }

  spawn(from: Vector3, towards: Vector3, damage: number): void {
    const p = this.pool.find((e) => !e.active);
    if (!p) return;
    p.mesh.position.copy(from);
    p.mesh.position.y = 1.0;
    p.light.position.copy(p.mesh.position);
    const dir = towards.clone().sub(from);
    dir.y = 0;
    dir.normalize();
    p.velocity.copy(dir).multiplyScalar(PROJECTILE_SPEED);
    p.damage = damage;
    p.diesAt = performance.now() + LIFETIME_MS;
    p.mesh.visible = true;
    p.light.visible = true;
    p.active = true;
  }

  /** returns total damage dealt to player this frame */
  update(deltaTime: number, now: number, playerPos: Vector3, obstacles: Box3[]): number {
    let dmg = 0;
    this.playerBox.setFromCenterAndSize(playerPos, new Vector3(0.8, 1.8, 0.8));
    for (const p of this.pool) {
      if (!p.active) continue;
      p.mesh.position.x += p.velocity.x * deltaTime;
      p.mesh.position.z += p.velocity.z * deltaTime;
      p.light.position.copy(p.mesh.position);

      if (this.playerBox.distanceToPoint(p.mesh.position) < HIT_RADIUS) {
        dmg += p.damage;
        this.deactivate(p);
        continue;
      }
      let hitObstacle = false;
      for (const box of obstacles) {
        if (box.containsPoint(p.mesh.position)) {
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle || now >= p.diesAt) this.deactivate(p);
    }
    return dmg;
  }

  private deactivate(p: Projectile): void {
    p.mesh.visible = false;
    p.light.visible = false;
    p.active = false;
  }
}
