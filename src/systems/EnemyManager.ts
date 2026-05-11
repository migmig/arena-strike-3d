import { Scene, Vector3, Box3 } from 'three';
import enemyData from '@data/enemies.json';
import { Enemy, type EnemySpec } from '@entities/Enemy';
import type { RNG } from '@utils/rng';
import type { EnemyKind } from './ScoreSystem';
import type { ProjectileSystem } from './ProjectileSystem';
import type { DeathFragments } from '@entities/DeathFragments';

const SPECS = enemyData as EnemySpec[];

export class EnemyManager {
  readonly enemies: Enemy[] = [];

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
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e) continue;
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
