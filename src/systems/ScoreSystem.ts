export type EnemyKind = 'grunt' | 'shooter' | 'charger' | 'boss';

export const BASE_SCORE: Record<EnemyKind, number> = {
  grunt: 100,
  shooter: 150,
  charger: 250,
  boss: 5000,
};

const COMBO_TIMEOUT_MS = 3000;
const RESET_TIMEOUT_MS = 4000;

export interface ComboTiers {
  readonly threshold: number;
  readonly multiplier: number;
}

export const COMBO_TIERS: readonly ComboTiers[] = [
  { threshold: 30, multiplier: 2.5 },
  { threshold: 15, multiplier: 2.0 },
  { threshold: 7, multiplier: 1.5 },
  { threshold: 3, multiplier: 1.2 },
];

export class ScoreSystem {
  private _score = 0;
  private _combo = 0;
  private _maxCombo = 0;
  private _kills = 0;
  private lastKillTime = -Infinity;

  constructor(private now: () => number = () => performance.now()) {}

  get score(): number {
    return this._score;
  }
  get combo(): number {
    return this._combo;
  }
  get maxCombo(): number {
    return this._maxCombo;
  }
  get kills(): number {
    return this._kills;
  }

  getMultiplier(): number {
    for (const tier of COMBO_TIERS) {
      if (this._combo >= tier.threshold) return tier.multiplier;
    }
    return 1.0;
  }

  onKill(kind: EnemyKind, isHeadshot: boolean): number {
    const t = this.now();
    if (t - this.lastKillTime > COMBO_TIMEOUT_MS) this._combo = 0;
    this._combo += isHeadshot ? 2 : 1;
    this.lastKillTime = t;
    this._maxCombo = Math.max(this._maxCombo, this._combo);
    this._kills += 1;
    const earned = Math.round(BASE_SCORE[kind] * this.getMultiplier());
    this._score += earned;
    return earned;
  }

  onPlayerHit(): void {
    this._combo = Math.floor(this._combo * 0.5);
  }

  tick(): void {
    if (this._combo === 0) return;
    if (this.now() - this.lastKillTime > RESET_TIMEOUT_MS) this._combo = 0;
  }

  reset(): void {
    this._score = 0;
    this._combo = 0;
    this._maxCombo = 0;
    this._kills = 0;
    this.lastKillTime = -Infinity;
  }
}
