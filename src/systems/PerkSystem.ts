import perkData from '@data/perks.json';
import type { RNG } from '@utils/rng';
import type { PlayerStats } from './Health';

export type PerkId =
  | 'move_speed'
  | 'reload_speed'
  | 'crit_chance'
  | 'max_health'
  | 'dash_cooldown'
  | 'damage_up'
  | 'headshot_bonus'
  | 'ammo_capacity'
  | 'lifesteal'
  | 'explosive'
  | 'fire_rate'
  | 'shield';

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  icon: string;
}

export interface PerkModifiers {
  damageMul: number;
  headshotMul: number;
  ammoCapacityMul: number;
  fireRateMul: number;
  damageReduction: number;
  lifestealPerKill: number;
  splashOnKill: number;
}

const PERKS = perkData as PerkDef[];

export const DEFAULT_PERK_MODS: PerkModifiers = {
  damageMul: 1,
  headshotMul: 2,
  ammoCapacityMul: 1,
  fireRateMul: 1,
  damageReduction: 0,
  lifestealPerKill: 0,
  splashOnKill: 0,
};

export class PerkSystem {
  readonly acquired: PerkId[] = [];
  readonly mods: PerkModifiers = { ...DEFAULT_PERK_MODS };

  constructor(private rng: RNG) {}

  offerThree(): readonly PerkDef[] {
    const remaining = PERKS.filter((p) => !this.acquired.includes(p.id));
    const pool = remaining.length >= 3 ? remaining : [...PERKS];
    const picks: PerkDef[] = [];
    const used = new Set<number>();
    while (picks.length < 3 && picks.length < pool.length) {
      const idx = this.rng.intRange(0, pool.length);
      if (used.has(idx)) continue;
      used.add(idx);
      const p = pool[idx];
      if (p) picks.push(p);
    }
    return picks;
  }

  apply(id: PerkId, stats: PlayerStats): void {
    this.acquired.push(id);
    switch (id) {
      case 'move_speed':
        stats.moveSpeedMultiplier *= 1.1;
        break;
      case 'reload_speed':
        stats.reloadSpeedMultiplier *= 1.25;
        break;
      case 'crit_chance':
        stats.critChance += 0.15;
        break;
      case 'max_health':
        stats.maxHealth += 25;
        stats.currentHealth += 25;
        break;
      case 'dash_cooldown':
        stats.dashCooldown = Math.max(0.5, stats.dashCooldown - 1);
        break;
      case 'damage_up':
        this.mods.damageMul *= 1.15;
        break;
      case 'headshot_bonus':
        this.mods.headshotMul += 0.5;
        break;
      case 'ammo_capacity':
        this.mods.ammoCapacityMul *= 1.25;
        break;
      case 'fire_rate':
        this.mods.fireRateMul *= 1.15;
        break;
      case 'shield':
        this.mods.damageReduction = Math.min(0.8, this.mods.damageReduction + 0.1);
        break;
      case 'lifesteal':
        this.mods.lifestealPerKill += 2;
        break;
      case 'explosive':
        this.mods.splashOnKill += 30;
        break;
    }
  }
}
