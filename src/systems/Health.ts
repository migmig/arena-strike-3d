export interface Damageable {
  hp: number;
  readonly maxHp: number;
  isDead: boolean;
  takeDamage(amount: number, isHeadshot: boolean): void;
}

export interface PlayerStats {
  maxHealth: number;
  currentHealth: number;
  moveSpeedMultiplier: number;
  reloadSpeedMultiplier: number;
  critChance: number;
  dashCooldown: number;
}

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  maxHealth: 100,
  currentHealth: 100,
  moveSpeedMultiplier: 1,
  reloadSpeedMultiplier: 1,
  critChance: 0,
  dashCooldown: 3,
};

export function applyDamage(target: Damageable, amount: number, isHeadshot: boolean): number {
  if (target.isDead) return 0;
  const dealt = Math.max(0, amount);
  target.hp = Math.max(0, target.hp - dealt);
  target.takeDamage(dealt, isHeadshot);
  if (target.hp <= 0) target.isDead = true;
  return dealt;
}

export function healPlayer(stats: PlayerStats, amount: number): number {
  const before = stats.currentHealth;
  stats.currentHealth = Math.min(stats.maxHealth, stats.currentHealth + amount);
  return stats.currentHealth - before;
}
