import { Vector3, type PerspectiveCamera, Frustum, Matrix4 } from 'three';
import waveData from '@data/waves.json';
import difficultyData from '@data/difficulty.json';
import type { EnemyManager } from './EnemyManager';
import type { EnemyKind } from './ScoreSystem';
import type { RNG } from '@utils/rng';

export interface WavePlan {
  wave: number;
  composition: Partial<Record<EnemyKind, number>>;
  spawnIntervalMs: number;
  isBoss?: boolean;
}

export interface DifficultyPreset {
  id: 'easy' | 'normal' | 'hard' | 'nightmare';
  label: string;
  hpMul: number;
  dmgMul: number;
  countMul: number;
  pickupMul: number;
}

export type WaveState = 'INTERMISSION' | 'SPAWNING' | 'CLEARING' | 'COMPLETE';

const WAVES = waveData as WavePlan[];
const DIFFICULTIES = difficultyData as DifficultyPreset[];

export class WaveSystem {
  private waveIndex = 0;
  private state: WaveState = 'INTERMISSION';
  private nextSpawnAt = 0;
  private remainingQueue: EnemyKind[] = [];
  private intermissionUntil = 0;
  private spawnPoints: Vector3[];

  private frustum = new Frustum();
  private projView = new Matrix4();

  constructor(
    private enemies: EnemyManager,
    private rng: RNG,
    private camera: PerspectiveCamera,
    private difficulty: DifficultyPreset = DIFFICULTIES[1] as DifficultyPreset,
    private intermissionMs = 5000,
    spawnRingRadius = 22,
  ) {
    this.spawnPoints = this.buildSpawnRing(spawnRingRadius);
  }

  private buildSpawnRing(radius: number): Vector3[] {
    const points: Vector3[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      points.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return points;
  }

  startNextWave(now: number): void {
    this.state = 'INTERMISSION';
    this.intermissionUntil = now + this.intermissionMs;
  }

  get currentWave(): number {
    return this.waveIndex + 1;
  }

  get currentState(): WaveState {
    return this.state;
  }

  get totalWaves(): number {
    return WAVES.length;
  }

  setDifficulty(id: DifficultyPreset['id']): void {
    const found = DIFFICULTIES.find((d) => d.id === id);
    if (found) this.difficulty = found;
  }

  private buildQueue(plan: WavePlan): EnemyKind[] {
    const queue: EnemyKind[] = [];
    for (const [kind, count] of Object.entries(plan.composition)) {
      const scaled = plan.isBoss
        ? (count ?? 0)
        : Math.max(1, Math.round((count ?? 0) * this.difficulty.countMul));
      for (let i = 0; i < scaled; i++) queue.push(kind as EnemyKind);
    }
    for (let i = queue.length - 1; i > 0; i--) {
      const j = this.rng.intRange(0, i + 1);
      [queue[i], queue[j]] = [queue[j] as EnemyKind, queue[i] as EnemyKind];
    }
    return queue;
  }

  private pickSpawnPoint(): Vector3 {
    this.projView.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projView);
    const outOfView = this.spawnPoints.filter((p) => !this.frustum.containsPoint(p));
    const pool = outOfView.length > 0 ? outOfView : this.spawnPoints;
    return this.rng.pick(pool).clone();
  }

  /** returns 'wave_cleared' when current wave just finished */
  update(now: number): 'wave_cleared' | 'game_complete' | null {
    if (this.state === 'INTERMISSION') {
      if (now >= this.intermissionUntil) {
        const plan = WAVES[this.waveIndex];
        if (!plan) {
          this.state = 'COMPLETE';
          return 'game_complete';
        }
        this.remainingQueue = this.buildQueue(plan);
        this.nextSpawnAt = now;
        this.state = 'SPAWNING';
      }
      return null;
    }
    if (this.state === 'SPAWNING') {
      if (this.remainingQueue.length === 0) {
        this.state = 'CLEARING';
      } else if (now >= this.nextSpawnAt) {
        const kind = this.remainingQueue.shift();
        if (kind) {
          const point = this.pickSpawnPoint();
          this.enemies.spawn(kind, point, now);
          const plan = WAVES[this.waveIndex];
          this.nextSpawnAt = now + (plan?.spawnIntervalMs ?? 1000);
        }
      }
    }
    if (this.state === 'CLEARING' && this.enemies.alive.length === 0) {
      this.waveIndex += 1;
      if (this.waveIndex >= WAVES.length) {
        this.state = 'COMPLETE';
        return 'game_complete';
      }
      this.startNextWave(now);
      return 'wave_cleared';
    }
    return null;
  }

  get hpMultiplier(): number {
    return this.difficulty.hpMul * Math.pow(1.1, this.waveIndex);
  }

  get dmgMultiplier(): number {
    return this.difficulty.dmgMul;
  }

  get currentDifficulty(): DifficultyPreset {
    return this.difficulty;
  }

  isBossWave(): boolean {
    return WAVES[this.waveIndex]?.isBoss === true;
  }

  reset(): void {
    this.waveIndex = 0;
    this.state = 'INTERMISSION';
    this.intermissionUntil = 0;
    this.remainingQueue = [];
  }
}

export { DIFFICULTIES };
