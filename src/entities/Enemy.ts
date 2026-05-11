import { Vector3, Scene, Box3, Object3D } from 'three';
import type { EnemyKind } from '@systems/ScoreSystem';
import type { Damageable } from '@systems/Health';
import type { HittableTarget } from '@systems/WeaponSystem';
import type { ProjectileSystem } from '@systems/ProjectileSystem';
import { createEnemyVisual, disposeVisual, type EnemyVisual } from './EnemyMesh';
import type { DeathFragments } from './DeathFragments';

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

const AVOID_RADIUS = 1.6;

export class Enemy implements Damageable, HittableTarget {
  hp: number;
  isDead = false;
  maxHp: number;
  kind: EnemyKind;
  state: EnemyState = 'SPAWN';
  visual: EnemyVisual;
  position: Vector3;
  spawnedAt = 0;
  lastAttackAt = -Infinity;
  stunUntil = 0;
  hitFlashUntil = 0;

  private bobPhase = 0;
  private hitBox = new Box3();
  private dir = new Vector3();
  private avoid = new Vector3();
  private lodLevel = 0;
  private tmpBox = new Box3();
  private tmpVec = new Vector3();
  private baseColor: number;

  constructor(
    public spec: EnemySpec,
    private scene: Scene,
    pos: Vector3,
    now: number,
  ) {
    this.kind = spec.id;
    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.spawnedAt = now;
    this.baseColor = Number(spec.color);
    this.visual = createEnemyVisual(spec.id, this.baseColor);
    this.visual.root.position.copy(pos);
    this.visual.root.position.y = 0;
    this.visual.root.userData['enemyRef'] = this;
    scene.add(this.visual.root);
    this.position = this.visual.root.position;
    this.bobPhase = Math.random() * Math.PI * 2;
    setTimeout(() => {
      if (this.state === 'SPAWN') this.state = 'CHASE';
    }, 400);
  }

  get visualHeight(): number {
    return this.visual.height;
  }

  takeDamage(_amount: number, _isHeadshot: boolean): void {
    if (this.isDead) return;
    this.state = 'STUN';
    const now = performance.now();
    this.stunUntil = now + 80;
    this.hitFlashUntil = now + 120;
  }

  getHitTarget(): { position: Vector3; headThresholdY: number; object: Object3D } {
    return {
      position: this.position,
      headThresholdY: this.position.y + this.visual.height * 0.75,
      object: this.visual.root,
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

  private animate(deltaTime: number, now: number, moving: boolean): void {
    if (this.lodLevel === 2) {
      this.visual.bobTarget.position.y = 0;
      this.visual.bobTarget.scale.setScalar(1);
      this.visual.light.intensity = 0;
      if (now < this.hitFlashUntil) {
        for (const m of this.visual.bodyMaterials) m.emissiveIntensity = 1.6;
      } else {
        for (const m of this.visual.bodyMaterials) m.emissiveIntensity = 0.35;
      }
      return;
    }
    const bobRate = this.lodLevel === 1 ? 0.5 : 1;
    this.bobPhase += deltaTime * (moving ? 6 : 2) * bobRate;
    const bobAmp = moving ? 0.08 : 0.04;
    this.visual.bobTarget.position.y = Math.sin(this.bobPhase) * bobAmp;
    const scalePulse = 1 + Math.sin(this.bobPhase * 0.5) * 0.02;
    this.visual.bobTarget.scale.setScalar(scalePulse);

    const pulse = 0.7 + Math.sin(now * 0.004) * 0.4;
    this.visual.core.emissiveIntensity = (this.kind === 'charger' ? 2.2 : 1.2) * pulse;
    this.visual.light.intensity = (this.kind === 'charger' ? 1.4 : 0.9) * pulse;

    if (now < this.hitFlashUntil) {
      for (const m of this.visual.bodyMaterials) m.emissiveIntensity = 1.6;
    } else {
      for (const m of this.visual.bodyMaterials) m.emissiveIntensity = 0.35;
    }
  }

  applyLOD(distSq: number): void {
    let level = 0;
    if (distSq > 40 * 40) level = 2;
    else if (distSq > 22 * 22) level = 1;
    if (level === this.lodLevel) return;
    this.lodLevel = level;
    this.visual.light.visible = level < 2;
  }

  update(
    deltaTime: number,
    playerPos: Vector3,
    now: number,
    obstacles: Box3[],
    projectiles: ProjectileSystem,
  ): number {
    if (this.isDead) return 0;
    this.animate(deltaTime, now, this.state === 'CHASE');
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
    const lookY = this.position.y + this.visual.height * 0.4;
    this.visual.root.lookAt(playerPos.x, lookY, playerPos.z);

    if (this.kind === 'shooter') {
      const preferredDist = 10;
      if (distance > preferredDist + 1) {
        this.move(deltaTime);
      } else if (distance < preferredDist - 1) {
        this.position.x -= this.dir.x * this.spec.moveSpeed * deltaTime;
        this.position.z -= this.dir.z * this.spec.moveSpeed * deltaTime;
      }
      if (inAttackRange && now - this.lastAttackAt >= this.spec.attackCooldownMs) {
        this.lastAttackAt = now;
        const muzzle = this.position.clone();
        muzzle.y += this.visual.height * 0.6;
        projectiles.spawn(muzzle, playerPos, this.spec.attackDamage);
        this.state = 'ATTACK';
      }
      return 0;
    }

    if (!inAttackRange) {
      this.state = 'CHASE';
      this.move(deltaTime);
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

  destroy(fragments?: DeathFragments): void {
    if (fragments) {
      const center = this.position.clone();
      center.y += this.visual.height * 0.4;
      fragments.burst(center, this.baseColor, 16);
    }
    this.scene.remove(this.visual.root);
    disposeVisual(this.visual);
  }

  computeBoundingBox(): Box3 {
    return this.hitBox.setFromObject(this.visual.root);
  }
}
