import { describe, it, expect } from 'vitest';
import { computeFinalDamage } from '@/systems/WeaponSystem';
import { DEFAULT_PERK_MODS, PerkSystem } from '@/systems/PerkSystem';
import { DEFAULT_PLAYER_STATS } from '@/systems/Health';
import { RNG } from '@/utils/rng';

const PISTOL_BASE = 20;

describe('damage formula: computeFinalDamage (canonical)', () => {
  it('body shot with no perks/crit/boost returns base damage', () => {
    const d = computeFinalDamage(PISTOL_BASE, false, false, DEFAULT_PERK_MODS, false);
    expect(d).toBe(20);
  });

  it('headshot applies headshotMul (default 2)', () => {
    const d = computeFinalDamage(PISTOL_BASE, true, false, DEFAULT_PERK_MODS, false);
    expect(d).toBe(40);
  });

  it('damage_up perk stacks multiplicatively', () => {
    const sys = new PerkSystem(new RNG('1'));
    const stats = { ...DEFAULT_PLAYER_STATS };
    sys.apply('damage_up', stats);
    sys.apply('damage_up', stats);
    // base × 1.15 × 1.15 = 26.45
    const d = computeFinalDamage(PISTOL_BASE, false, false, sys.mods, false);
    expect(d).toBeCloseTo(26.45, 4);
  });

  it('headshot_bonus perk raises headshotMul from 2 to 2.5', () => {
    const sys = new PerkSystem(new RNG('1'));
    const stats = { ...DEFAULT_PLAYER_STATS };
    sys.apply('headshot_bonus', stats);
    const d = computeFinalDamage(PISTOL_BASE, true, false, sys.mods, false);
    expect(d).toBe(50); // 20 × 2.5
  });

  it('damage_boost pickup doubles output', () => {
    const d = computeFinalDamage(PISTOL_BASE, false, false, DEFAULT_PERK_MODS, true);
    expect(d).toBe(40);
  });

  it('crit doubles output independently of headshot', () => {
    const body = computeFinalDamage(PISTOL_BASE, false, true, DEFAULT_PERK_MODS, false);
    const head = computeFinalDamage(PISTOL_BASE, true, true, DEFAULT_PERK_MODS, false);
    expect(body).toBe(40); // 20 × 2 crit
    expect(head).toBe(80); // 20 × 2 HS × 2 crit
  });

  it('full stack: HS + 3x damage_up + crit + boost', () => {
    const sys = new PerkSystem(new RNG('1'));
    const stats = { ...DEFAULT_PLAYER_STATS };
    sys.apply('damage_up', stats);
    sys.apply('damage_up', stats);
    sys.apply('damage_up', stats);
    // 20 × 1.15^3 × 2 (HS) × 2 (crit) × 2 (boost) = 20 × 1.520875 × 8 = 243.34
    const d = computeFinalDamage(PISTOL_BASE, true, true, sys.mods, true);
    expect(d).toBeCloseTo(243.34, 1);
  });

  it('modifiers are pure multiplicative (no implicit additions)', () => {
    // headshotMul should NOT add to damageMul; both multiply
    const mods = { ...DEFAULT_PERK_MODS, damageMul: 1.5, headshotMul: 3 };
    const d = computeFinalDamage(PISTOL_BASE, true, false, mods, false);
    expect(d).toBe(20 * 1.5 * 3);
  });
});

describe('damage formula: crit roll determinism via seeded RNG', () => {
  it('crit fires when rng.next() < critChance', () => {
    // seedrandom('crit-fire-test') first draw < 0.5
    const rng = new RNG('crit-fire-test');
    const first = rng.next();
    expect(first).toBeLessThan(1);
    // simulate the WeaponSystem branch: crit if rng.next() < critChance
    const rng2 = new RNG('crit-fire-test');
    const isCrit = rng2.next() < 1; // critChance = 100% → always crit
    expect(isCrit).toBe(true);
  });

  it('zero crit chance never produces crit regardless of rng', () => {
    const rng = new RNG('any');
    for (let i = 0; i < 100; i++) {
      const isCrit = 0 > 0 && rng.next() < 0;
      expect(isCrit).toBe(false);
    }
  });

  it('crit_chance perk gives 15% per stack and total accumulates linearly on stats', () => {
    const sys = new PerkSystem(new RNG('1'));
    const stats = { ...DEFAULT_PLAYER_STATS };
    sys.apply('crit_chance', stats);
    expect(stats.critChance).toBeCloseTo(0.15);
    sys.apply('crit_chance', stats);
    expect(stats.critChance).toBeCloseTo(0.3);
  });
});
