import { describe, it, expect } from 'vitest';
import weapons from '../../src/data/weapons.json';
import enemies from '../../src/data/enemies.json';
import difficulty from '../../src/data/difficulty.json';
import perks from '../../src/data/perks.json';
import waves from '../../src/data/waves.json';
import { PerkSystem, DEFAULT_PERK_MODS, type PerkId } from '../../src/systems/PerkSystem';
import { DEFAULT_PLAYER_STATS } from '../../src/systems/Health';
import { RNG } from '../../src/utils/rng';

interface Weapon {
  id: string;
  damage: number;
  fireRateMs: number;
  pellets: number;
  magSize: number;
  reloadMs: number;
}
interface Enemy {
  id: string;
  hp: number;
  scoreValue: number;
}

const W = weapons as Weapon[];
const E = enemies as Enemy[];

function findWeapon(id: string): Weapon {
  const w = W.find((x) => x.id === id);
  if (!w) throw new Error(`weapon ${id} not found`);
  return w;
}
function findEnemy(id: string): Enemy {
  const e = E.find((x) => x.id === id);
  if (!e) throw new Error(`enemy ${id} not found`);
  return e;
}

/** Bullets-to-kill via body shots, no perks. */
function shotsToKill(weapon: Weapon, target: Enemy, damageMul = 1): number {
  const perShot = weapon.damage * weapon.pellets * damageMul;
  return Math.ceil(target.hp / perShot);
}

describe('balance: weapon vs enemy TTK', () => {
  it('Pistol kills a Grunt in roughly 3 body shots', () => {
    const shots = shotsToKill(findWeapon('pistol'), findEnemy('grunt'));
    expect(shots).toBeGreaterThanOrEqual(2);
    expect(shots).toBeLessThanOrEqual(3);
  });

  it('SMG kills a Grunt in roughly 4-5 body shots', () => {
    const shots = shotsToKill(findWeapon('smg'), findEnemy('grunt'));
    expect(shots).toBeGreaterThanOrEqual(4);
    expect(shots).toBeLessThanOrEqual(5);
  });

  it('Shotgun nearly one-shots a Grunt at point blank (≤ 2 volleys)', () => {
    const shots = shotsToKill(findWeapon('shotgun'), findEnemy('grunt'));
    expect(shots).toBeLessThanOrEqual(2);
  });

  it('Shotgun cannot one-shot a Charger', () => {
    const shots = shotsToKill(findWeapon('shotgun'), findEnemy('charger'));
    expect(shots).toBeGreaterThanOrEqual(2);
  });

  it('No weapon can one-shot the boss without perks', () => {
    for (const w of W) {
      const shots = shotsToKill(w, findEnemy('boss'));
      expect(shots).toBeGreaterThan(10);
    }
  });
});

describe('balance: difficulty scaling stays within sane bounds', () => {
  it('exactly 4 presets are defined (easy/normal/hard/nightmare)', () => {
    expect(difficulty).toHaveLength(4);
    const ids = new Set(difficulty.map((d) => d.id));
    expect(ids).toEqual(new Set(['easy', 'normal', 'hard', 'nightmare']));
  });

  it('multipliers are monotonic from easy to nightmare', () => {
    const easy = difficulty.find((d) => d.id === 'easy')!;
    const normal = difficulty.find((d) => d.id === 'normal')!;
    const hard = difficulty.find((d) => d.id === 'hard')!;
    const night = difficulty.find((d) => d.id === 'nightmare')!;
    expect(easy.hpMul).toBeLessThan(normal.hpMul);
    expect(normal.hpMul).toBeLessThan(hard.hpMul);
    expect(hard.hpMul).toBeLessThan(night.hpMul);
    expect(easy.dmgMul).toBeLessThan(night.dmgMul);
    expect(easy.countMul).toBeLessThan(night.countMul);
    expect(easy.pickupMul).toBeGreaterThan(night.pickupMul);
  });

  it('Pistol on Nightmare still kills Grunt in ≤ 4 shots', () => {
    const night = difficulty.find((d) => d.id === 'nightmare')!;
    const grunt = { ...findEnemy('grunt'), hp: findEnemy('grunt').hp * night.hpMul };
    const shots = shotsToKill(findWeapon('pistol'), grunt);
    expect(shots).toBeLessThanOrEqual(4);
  });
});

describe('balance: perks', () => {
  it('all 12 perks defined in tasks.md are present', () => {
    expect(perks).toHaveLength(12);
    const ids = new Set(perks.map((p) => p.id));
    const expected: PerkId[] = [
      'move_speed',
      'reload_speed',
      'crit_chance',
      'max_health',
      'dash_cooldown',
      'damage_up',
      'headshot_bonus',
      'ammo_capacity',
      'lifesteal',
      'explosive',
      'fire_rate',
      'shield',
    ];
    for (const id of expected) expect(ids.has(id)).toBe(true);
  });

  it('shield perk caps damage reduction at 0.8 even with stacking', () => {
    const sys = new PerkSystem(new RNG('1'));
    const stats = { ...DEFAULT_PLAYER_STATS };
    for (let i = 0; i < 20; i++) sys.apply('shield', stats);
    expect(sys.mods.damageReduction).toBeLessThanOrEqual(0.8);
  });

  it('damage_up stacks multiplicatively but stays sane after 5 stacks', () => {
    const sys = new PerkSystem(new RNG('1'));
    const stats = { ...DEFAULT_PLAYER_STATS };
    for (let i = 0; i < 5; i++) sys.apply('damage_up', stats);
    // 1.15^5 ≈ 2.011
    expect(sys.mods.damageMul).toBeGreaterThan(1.9);
    expect(sys.mods.damageMul).toBeLessThan(2.1);
  });

  it('max_health perk raises max and current HP by 25', () => {
    const sys = new PerkSystem(new RNG('1'));
    const stats = { ...DEFAULT_PLAYER_STATS };
    const beforeMax = stats.maxHealth;
    const beforeHp = stats.currentHealth;
    sys.apply('max_health', stats);
    expect(stats.maxHealth).toBe(beforeMax + 25);
    expect(stats.currentHealth).toBe(beforeHp + 25);
  });

  it('dash_cooldown perk does not go below 0.5s after 10 stacks', () => {
    const sys = new PerkSystem(new RNG('1'));
    const stats = { ...DEFAULT_PLAYER_STATS };
    for (let i = 0; i < 10; i++) sys.apply('dash_cooldown', stats);
    expect(stats.dashCooldown).toBeGreaterThanOrEqual(0.5);
  });

  it('offerThree returns 3 distinct perks when 3+ are available', () => {
    const sys = new PerkSystem(new RNG('42'));
    const offers = sys.offerThree();
    expect(offers.length).toBe(3);
    const ids = offers.map((o) => o.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('default modifier table matches expected baselines', () => {
    expect(DEFAULT_PERK_MODS.damageMul).toBe(1);
    expect(DEFAULT_PERK_MODS.headshotMul).toBe(2);
    expect(DEFAULT_PERK_MODS.damageReduction).toBe(0);
  });
});

describe('balance: wave schedule', () => {
  it('exactly 5 waves planned with wave 5 marked as boss', () => {
    const list = waves as Array<{ wave: number; isBoss?: boolean }>;
    expect(list).toHaveLength(5);
    expect(list[list.length - 1]?.isBoss).toBe(true);
  });

  it('wave enemy counts grow monotonically (Normal)', () => {
    const list = waves as unknown as Array<{ wave: number; composition: Record<string, number>; isBoss?: boolean }>;
    const totals = list.map((w) => Object.values(w.composition).reduce((a, b) => a + b, 0));
    // Boss wave may have a low non-boss count; compare only 1..4.
    for (let i = 1; i < 4; i++) {
      expect(totals[i]).toBeGreaterThanOrEqual(totals[i - 1] ?? 0);
    }
  });
});

describe('balance: wave timing (analytic, M4.9)', () => {
  // Realistic baseline player: 50% body-shot accuracy with the pistol.
  const REALISTIC_ACCURACY = 0.5;

  interface WavePlan {
    wave: number;
    composition: Record<string, number>;
    spawnIntervalMs: number;
    isBoss?: boolean;
  }

  function estimateWaveMs(plan: WavePlan, difficultyId: string, accuracy: number): number {
    const diff = difficulty.find((d) => d.id === difficultyId)!;
    const pistol = findWeapon('pistol');
    let totalShotsFired = 0;
    let killTimeMs = 0;
    let totalCount = 0;
    for (const [kind, baseCount] of Object.entries(plan.composition)) {
      const enemy = findEnemy(kind);
      const scaledCount = plan.isBoss
        ? baseCount
        : Math.max(1, Math.round(baseCount * diff.countMul));
      const hp = enemy.hp * diff.hpMul;
      const shotsHit = Math.ceil(hp / (pistol.damage * pistol.pellets));
      const shotsFired = Math.ceil(shotsHit / accuracy);
      totalShotsFired += shotsFired * scaledCount;
      killTimeMs += shotsFired * pistol.fireRateMs * scaledCount;
      totalCount += scaledCount;
    }
    const reloads = Math.floor(totalShotsFired / pistol.magSize);
    killTimeMs += reloads * pistol.reloadMs;
    const spawnTimeMs = totalCount * plan.spawnIntervalMs;
    // Player can only kill after spawn; lower bound is the slower of the two pipelines.
    return Math.max(spawnTimeMs, killTimeMs);
  }

  const nonBoss = (waves as unknown as WavePlan[]).filter((w) => !w.isBoss);

  it('every non-boss wave stays under PRD upper bound + 30% margin (Normal, 50% acc)', () => {
    for (const plan of nonBoss) {
      const ms = estimateWaveMs(plan, 'normal', REALISTIC_ACCURACY);
      // PRD §6: target 60~90s. Safety margin: 90s × 1.3 = 117s.
      expect(ms, `wave ${plan.wave} took ${ms}ms`).toBeLessThanOrEqual(117_000);
    }
  });

  it('final non-boss wave (4) is meaningful: at least 30s of work on Normal', () => {
    const w4 = nonBoss.find((w) => w.wave === 4)!;
    const ms = estimateWaveMs(w4, 'normal', REALISTIC_ACCURACY);
    expect(ms).toBeGreaterThanOrEqual(30_000);
  });

  it('wave 4 on Nightmare still stays within reasonable bounds (≤ 180s)', () => {
    const w4 = nonBoss.find((w) => w.wave === 4)!;
    const ms = estimateWaveMs(w4, 'nightmare', REALISTIC_ACCURACY);
    // Hardest preset + realistic accuracy must not balloon the wave beyond 3 min.
    expect(ms).toBeLessThanOrEqual(180_000);
  });

  it('wave time grows monotonically across non-boss waves (Normal)', () => {
    const times = nonBoss.map((p) => estimateWaveMs(p, 'normal', REALISTIC_ACCURACY));
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1] ?? 0);
    }
  });

  it('wave 1 stays short for onboarding (≤ 25s on Normal)', () => {
    const w1 = nonBoss.find((w) => w.wave === 1)!;
    const ms = estimateWaveMs(w1, 'normal', REALISTIC_ACCURACY);
    expect(ms).toBeLessThanOrEqual(25_000);
  });
});
