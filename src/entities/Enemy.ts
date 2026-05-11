import {
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Vector3,
  Scene,
  Box3,
  Object3D,
} from 'three';
import type { EnemyKind } from '@systems/ScoreSystem';
import type { Damageable } from '@systems/Health';
import type { HittableTarget } from '@systems/WeaponSystem';
import type { ProjectileSystem } from '@systems/ProjectileSystem';

export type EnemyState = 'SPAWN' | 'CHASE' | 'ATTACK' | 'STUN' | 'DIE';

export interface EnemySpec {
  id: EnemyKind;
  hp: number;
  moveSpeed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldownMs: number;
  scoreValue: number;
  color: string;
}

const ENEMY_HEIGHT = 1.6;
const ENEMY_HALF = 0.4;
const AVOID_RADIUS = 1.6;

export class Enemy implements Damageable, HittableTarget {
  hp: number;
  isDead = false;
  maxHp: number;
  kind: EnemyKind;
  state: EnemyState = 'SPAWN';
  mesh: Mesh;
  position: Vector3;
  spawnedAt = 0;
  lastAttackAt = -Infinity;
  stunUntil = 0;

  private hitBox = new Box3();
  private dir = new Vector3();
  private avoid = new Vector3();
  private tmpBox = new Box3();
  private tmpVec = new Vector3();

  constructor(
    public spec: EnemySpec,
    scene: Scene,
    pos: Vector3,
    now: number,
  ) {
    this.kind = spec.id;
    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.spawnedAt = now;
    const color = Number(spec.color);
    const mat = new MeshStandardMaterial({ color });
    this.mesh = new Mesh(new BoxGeometry(ENEMY_HALF * 2, ENEMY_HEIGHT, ENEMY_HALF * 2), mat);
    this.mesh.position.copy(pos);
    this.mesh.position.y = ENEMY_HEIGHT / 2;
    this.mesh.userData['enemyRef'] = this;
    scene.add(this.mesh);
    this.position = this.mesh.position;
    setTimeout(() => {
      if (this.state === 'SPAWN') this.state = 'CHASE';
    }, 400);
  }

  takeDamage(_amount: number, _isHeadshot: boolean): void {
    if (this.isDead) return;
    this.state = 'STUN';
    this.stunUntil = performance.now() + 80;
  }

  getHitTarget(): { position: Vector3; headThresholdY: number; object: Object3D } {
    return {
      position: this.position,
      headThresholdY: this.position.y + ENEMY_HEIGHT * 0.3,
      object: this.mesh,
    };
  }

  private computeAvoid(obstacles: Box3[]): Vector3 {
    this.avoid.set(0, 0, 0);
    for (const box of obstacles) {
      box.getCenter(this.tmpVec);
      const dx = this.position.x - this.tmpVec.x;
      const dz = this.position.z - this.tmpVec.z;
      this.tmpBox.copy(box).expandByScalar(AVOID_RADIUS);
      if (this.tmpBox.containsPoint(this.position)) {
        const dist = Math.hypot(dx, dz) || 0.001;
        const strength = (AVOID_RADIUS + 1) / dist;
        this.avoid.x += (dx / dist) * strength;
        this.avoid.z += (dz / dist) * strength;
      }
    }
    return this.avoid;
  }

  /** returns melee damage if attacking this frame, else 0. Shooter fires via projectiles. */
  update(
    deltaTime: number,
    playerPos: Vector3,
    now: number,
    obstacles: Box3[],
    projectiles: ProjectileSystem,
  ): number {
    if (this.isDead) return 0;
    if (this.state === 'STUN' && now < this.stunUntil) return 0;
    if (this.state === 'STUN') this.state = 'CHASE';
    if (this.state === 'SPAWN') return 0;

    this.dir.subVectors(playerPos, this.position);
    this.dir.y = 0;
    const distance = this.dir.length();
    if (distance < 0.001) return 0;
    this.dir.normalize();

    const avoid = this.computeAvoid(obstacles);
    if (avoid.lengthSq() > 0) {
      this.dir.x += avoid.x * 0.8;
      this.dir.z += avoid.z * 0.8;
      this.dir.normalize();
    }

    const inAttackRange = distance <= this.spec.attackRange;

    if (this.kind === 'shooter') {
      const preferredDist = 10;
      if (distance > preferredDist + 1) {
        this.move(deltaTime);
      } else if (distance < preferredDist - 1) {
        this.position.x -= this.dir.x * this.spec.moveSpeed * deltaTime;
        this.position.z -= this.dir.z * this.spec.moveSpeed * deltaTime;
      }
      this.mesh.lookAt(playerPos.x, this.position.y, playerPos.z);
      if (
        inAttackRange &&
        now - this.lastAttackAt >= this.spec.attackCooldownMs
      ) {
        this.lastAttackAt = now;
        projectiles.spawn(this.position.clone(), playerPos, this.spec.attackDamage);
        this.state = 'ATTACK';
      }
      return 0;
    }

    if (!inAttackRange) {
      this.state = 'CHASE';
      this.move(deltaTime);
      this.mesh.lookAt(playerPos.x, this.position.y, playerPos.z);
      return 0;
    }

    this.state = 'ATTACK';
    if (now - this.lastAttackAt >= this.spec.attackCooldownMs) {
      this.lastAttackAt = now;
      if (this.kind === 'charger') {
        this.isDead = true;
        return this.spec.attackDamage;
      }
      return this.spec.attackDamage;
    }
    return 0;
  }

  private move(deltaTime: number): void {
    const step = this.spec.moveSpeed * deltaTime;
    this.position.x += this.dir.x * step;
    this.position.z += this.dir.z * step;
  }

  destroy(scene: Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshStandardMaterial).dispose();
  }

  computeBoundingBox(): Box3 {
    return this.hitBox.setFromObject(this.mesh);
  }
}
