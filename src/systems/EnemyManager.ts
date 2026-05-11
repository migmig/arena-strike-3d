import { Scene, Vector3, Box3 } from 'three';
import enemyData from '@data/enemies.json';
import { Enemy, type EnemySpec } from '@entities/Enemy';
import type { RNG } from '@utils/rng';
import type { EnemyKind } from './ScoreSystem';
import type { ProjectileSystem } from './ProjectileSystem';
import type { DeathFragments } from '@entities/DeathFragments';

const SPECS = enemyData as EnemySpec[];
const OCCLUSION_MIN_DIST_SQ = 8 * 8;
const OCCLUSION_STAGGER = 4;

function segmentBlockedByBox(
  px: number,
  pz: number,
  ex: number,
  ez: number,
  bx0: number,
  bx1: number,
  bz0: number,
  bz1: number,
): boolean {
  const dx = ex - px;
  const dz = ez - pz;
  let tmin = 0;
  let tmax = 1;
  const invDx = dx === 0 ? Infinity : 1 / dx;
  const invDz = dz === 0 ? Infinity : 1 / dz;
  const tx0 = (bx0 - px) * invDx;
  const tx1 = (bx1 - px) * invDx;
  tmin = Math.max(tmin, Math.min(tx0, tx1));
  tmax = Math.min(tmax, Math.max(tx0, tx1));
  const tz0 = (bz0 - pz) * invDz;
  const tz1 = (bz1 - pz) * invDz;
  tmin = Math.max(tmin, Math.min(tz0, tz1));
  tmax = Math.min(tmax, Math.max(tz0, tz1));
  return tmax >= tmin && tmax >= 0 && tmin <= 1;
}

export class EnemyManager {
  readonly enemies: Enemy[] = [];
  private occlusionFrame = 0;

  constructor(
    private scene: Scene,
    private rng: RNG,
  ) {}

  spawn(kind: EnemyKind, pos: Vector3, now: number): Enemy | null {
    const spec = SPECS.find((s) => s.id === kind);
    if (!spec) return null;
    const enemy = new Enemy(spec, this.scene, pos, now);
    this.enemies.push(enemy);
    return enemy;
  }

  spawnAtRandom(kind: EnemyKind, bounds: number, now: number): Enemy | null {
    const x = this.rng.range(-bounds, bounds);
    const z = this.rng.range(-bounds, bounds);
    return this.spawn(kind, new Vector3(x, 0, z), now);
  }

  update(
    deltaTime: number,
    playerPos: Vector3,
    now: number,
    obstacles: Box3[],
    projectiles: ProjectileSystem,
    fragments?: DeathFragments,
  ): number {
    let damageToPlayer = 0;
    this.occlusionFrame = (this.occlusionFrame + 1) % OCCLUSION_STAGGER;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e) continue;
      const dx = e.position.x - playerPos.x;
      const dz = e.position.z - playerPos.z;
      const distSq = dx * dx + dz * dz;
      e.applyLOD(distSq);
      if (distSq > OCCLUSION_MIN_DIST_SQ && i % OCCLUSION_STAGGER === this.occlusionFrame) {
        let blocked = false;
        for (let j = 0; j < obstacles.length; j++) {
          const box = obstacles[j];
          if (!box) continue;
          if (
            segmentBlockedByBox(
              playerPos.x,
              playerPos.z,
              e.position.x,
              e.position.z,
              box.min.x,
              box.max.x,
              box.min.z,
              box.max.z,
            )
          ) {
            blocked = true;
            break;
          }
        }
        e.applyOcclusion(blocked);
      }
      damageToPlayer += e.update(deltaTime, playerPos, now, obstacles, projectiles);
      if (e.isDead) {
        e.destroy(fragments);
        this.enemies.splice(i, 1);
      }
    }
    return damageToPlayer;
  }

  clear(): void {
    for (const e of this.enemies) e.destroy();
    this.enemies.length = 0;
  }

  get alive(): readonly Enemy[] {
    return this.enemies;
  }
}
