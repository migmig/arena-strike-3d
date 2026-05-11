import {
  Mesh,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Vector3,
  Scene,
  Object3D,
} from 'three';
import type { Damageable } from '@systems/Health';
import type { HittableTarget } from '@systems/WeaponSystem';
import type { EnemyKind } from '@systems/ScoreSystem';
import type { EnemyManager } from '@systems/EnemyManager';

export type BossPhase = 'P1' | 'P2' | 'P3' | 'TRANSITION' | 'DIE';

const BOSS_RADIUS = 1.4;
const BOSS_Y = 1.6;
const TRANSITION_MS = 2000;
const SUMMON_COOLDOWN_MS = 10000;
const AOE_RADIUS = 5;

export class Boss implements Damageable, HittableTarget {
  hp: number;
  maxHp: number;
  isDead = false;
  kind: EnemyKind = 'boss';
  mesh: Mesh;
  position: Vector3;

  phase: BossPhase = 'P1';
  private transitionUntil = 0;
  private lastShotAt = 0;
  private lastSummonAt = 0;
  private lastAoeAt = 0;
  private dir = new Vector3();

  constructor(scene: Scene, pos: Vector3, maxHp: number) {
    this.maxHp = maxHp;
    this.hp = maxHp;
    const mat = new MeshStandardMaterial({
      color: 0xff3030,
      emissive: 0x802020,
      emissiveIntensity: 0.4,
      metalness: 0.3,
    });
    this.mesh = new Mesh(new IcosahedronGeometry(BOSS_RADIUS, 1), mat);
    this.mesh.position.set(pos.x, BOSS_Y, pos.z);
    scene.add(this.mesh);
    this.position = this.mesh.position;
  }

  takeDamage(_amount: number, _isHeadshot: boolean): void {
    if (this.isDead) return;
    const ratio = this.hp / this.maxHp;
    if (this.phase === 'P1' && ratio <= 0.67) this.enterTransition('P2');
    else if (this.phase === 'P2' && ratio <= 0.33) this.enterTransition('P3');
  }

  private enterTransition(next: BossPhase): void {
    this.phase = 'TRANSITION';
    this.transitionUntil = performance.now() + TRANSITION_MS;
    this.lastShotAt = this.transitionUntil;
    this.lastSummonAt = this.transitionUntil;
    this.lastAoeAt = this.transitionUntil;
    (this.mesh.material as MeshStandardMaterial).emissiveIntensity = 1.5;
    setTimeout(() => {
      this.phase = next;
      (this.mesh.material as MeshStandardMaterial).emissiveIntensity = 0.4;
    }, TRANSITION_MS);
  }

  getHitTarget(): { position: Vector3; headThresholdY: number; object: Object3D } {
    return {
      position: this.position,
      headThresholdY: this.position.y + BOSS_RADIUS * 0.5,
      object: this.mesh,
    };
  }

  /** returns damage to player this frame */
  update(
    deltaTime: number,
    playerPos: Vector3,
    now: number,
    enemies: EnemyManager,
  ): number {
    if (this.isDead) return 0;
    if (this.phase === 'TRANSITION') return 0;

    this.dir.subVectors(playerPos, this.position);
    this.dir.y = 0;
    const distance = this.dir.length();
    this.dir.normalize();
    this.mesh.rotation.y += deltaTime * 0.5;

    let damage = 0;
    const stride = 2.0 * deltaTime;
    if (distance > 8) {
      this.position.x += this.dir.x * stride;
      this.position.z += this.dir.z * stride;
    } else {
      const tangent = new Vector3(-this.dir.z, 0, this.dir.x);
      this.position.x += tangent.x * stride * 0.6;
      this.position.z += tangent.z * stride * 0.6;
    }

    if (this.phase === 'P1') {
      if (now - this.lastShotAt >= 900 && distance < 20) {
        this.lastShotAt = now;
        damage += 14;
      }
    } else if (this.phase === 'P2') {
      if (now - this.lastShotAt >= 1100 && distance < 22) {
        this.lastShotAt = now;
        damage += 10;
      }
      if (now - this.lastSummonAt >= SUMMON_COOLDOWN_MS) {
        this.lastSummonAt = now;
        const minion1 = new Vector3(this.position.x + 2, 0, this.position.z + 2);
        const minion2 = new Vector3(this.position.x - 2, 0, this.position.z - 2);
        enemies.spawn('grunt', minion1, now);
        enemies.spawn('grunt', minion2, now);
      }
    } else if (this.phase === 'P3') {
      const dash = 5.0 * deltaTime;
      this.position.x += this.dir.x * dash;
      this.position.z += this.dir.z * dash;
      if (distance < AOE_RADIUS && now - this.lastAoeAt >= 1800) {
        this.lastAoeAt = now;
        damage += 25;
      }
    }
    return damage;
  }

  destroy(scene: Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshStandardMaterial).dispose();
  }
}
