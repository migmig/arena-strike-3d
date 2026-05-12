import { Vector3, Raycaster } from 'three';
import type { Scene, PerspectiveCamera } from 'three';
import weaponData from '@data/weapons.json';
import type { RNG } from '@utils/rng';
import type { InputManager } from '@managers/InputManager';
import { TracerPool } from '@entities/Tracer';
import { MuzzleFlash } from '@entities/MuzzleFlash';
import { applyDamage, type Damageable, type PlayerStats } from './Health';
import { DEFAULT_PERK_MODS, type PerkModifiers } from './PerkSystem';
import type { ActiveBuff } from './PickupSystem';

/**
 * Modifiers consumed by the fire path. Defaults are neutral — passing
 * `undefined` for any of these is equivalent to no perks/buffs/crits.
 */
export interface FireModifiers {
  perkMods?: PerkModifiers;
  buffs?: readonly ActiveBuff[];
  stats?: PlayerStats;
}

const NEUTRAL_FIRE_MODS: Required<FireModifiers> = {
  perkMods: DEFAULT_PERK_MODS,
  buffs: [],
  stats: {
    maxHealth: 100,
    currentHealth: 100,
    moveSpeedMultiplier: 1,
    reloadSpeedMultiplier: 1,
    critChance: 0,
    dashCooldown: 3,
  },
};

/**
 * Canonical damage formula. Caller-owned so it can be unit tested
 * independently of the rest of the WeaponSystem (which needs Three.js).
 *
 *   final = base × damageMul × (HS ? headshotMul : 1) × (crit ? 2 : 1) × (boost ? 2 : 1)
 */
export function computeFinalDamage(
  base: number,
  isHeadshot: boolean,
  isCrit: boolean,
  perkMods: PerkModifiers,
  damageBoostActive: boolean,
): number {
  let dmg = base * perkMods.damageMul;
  if (isHeadshot) dmg *= perkMods.headshotMul;
  if (isCrit) dmg *= 2;
  if (damageBoostActive) dmg *= 2;
  return dmg;
}

export type WeaponId = 'pistol' | 'smg' | 'shotgun';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  damage: number;
  fireRateMs: number;
  magSize: number;
  reloadMs: number;
  spread: number;
  pellets: number;
  autoFire: boolean;
  range: number;
  unlimitedReserve: boolean;
  reserveStart?: number;
}

export interface WeaponState {
  spec: WeaponSpec;
  ammoInMag: number;
  reserve: number;
  nextFireAt: number;
  reloadingUntil: number;
}

export interface HittableTarget extends Damageable {
  getHitTarget(): {
    position: Vector3;
    headThresholdY: number;
    object: object;
  };
}

const WEAPONS = weaponData as WeaponSpec[];

export class WeaponSystem {
  readonly slots: WeaponState[];
  activeIndex = 0;
  prevIndex = 0;
  firedThisFrame = false;

  private tracers: TracerPool;
  private muzzle: MuzzleFlash;
  private raycaster = new Raycaster();
  private dir = new Vector3();

  constructor(
    private scene: Scene,
    private camera: PerspectiveCamera,
    private rng: RNG,
    private now: () => number = () => performance.now(),
  ) {
    this.slots = WEAPONS.map((spec) => ({
      spec,
      ammoInMag: spec.magSize,
      reserve: spec.unlimitedReserve ? Number.POSITIVE_INFINITY : (spec.reserveStart ?? 0),
      nextFireAt: 0,
      reloadingUntil: 0,
    }));
    this.tracers = new TracerPool(scene, 24);
    this.muzzle = new MuzzleFlash(scene, camera);
  }

  get active(): WeaponState {
    return this.slots[this.activeIndex] as WeaponState;
  }

  switchTo(index: number): void {
    if (index < 0 || index >= this.slots.length || index === this.activeIndex) return;
    this.prevIndex = this.activeIndex;
    this.activeIndex = index;
    this.active.reloadingUntil = 0;
  }

  switchPrev(): void {
    this.switchTo(this.prevIndex);
  }

  reload(): void {
    const w = this.active;
    if (w.ammoInMag === w.spec.magSize) return;
    if (w.spec.unlimitedReserve === false && w.reserve <= 0) return;
    if (w.reloadingUntil > this.now()) return;
    w.reloadingUntil = this.now() + w.spec.reloadMs;
  }

  private finishReload(): void {
    const w = this.active;
    if (w.reloadingUntil === 0 || w.reloadingUntil > this.now()) return;
    const need = w.spec.magSize - w.ammoInMag;
    if (w.spec.unlimitedReserve) {
      w.ammoInMag = w.spec.magSize;
    } else {
      const taken = Math.min(need, w.reserve);
      w.ammoInMag += taken;
      w.reserve -= taken;
    }
    w.reloadingUntil = 0;
  }

  private fire(
    targets: readonly HittableTarget[],
    adsFactor: number,
    mods: Required<FireModifiers>,
  ): HitResult[] {
    const w = this.active;
    const t = this.now();
    if (t < w.nextFireAt || w.reloadingUntil > 0) return [];
    if (w.ammoInMag <= 0) {
      this.reload();
      return [];
    }
    w.ammoInMag -= 1;
    w.nextFireAt = t + w.spec.fireRateMs;
    this.muzzle.trigger(t);
    this.firedThisFrame = true;

    const results: HitResult[] = [];
    const origin = new Vector3();
    this.camera.getWorldPosition(origin);

    const damageBoostActive = mods.buffs.some((b) => b.id === 'damage_boost');
    const critChance = mods.stats.critChance;

    const spread = w.spec.spread * adsFactor;
    for (let i = 0; i < w.spec.pellets; i++) {
      this.camera.getWorldDirection(this.dir);
      const sx = (this.rng.next() - 0.5) * 2 * spread;
      const sy = (this.rng.next() - 0.5) * 2 * spread;
      this.dir.x += sx;
      this.dir.y += sy;
      this.dir.normalize();
      this.raycaster.set(origin, this.dir);
      this.raycaster.far = w.spec.range;

      const hit = this.raycastTargets(targets);
      if (hit) {
        const isHeadshot = hit.point.y >= hit.target.getHitTarget().headThresholdY;
        const isCrit = critChance > 0 && this.rng.next() < critChance;
        const finalDamage = computeFinalDamage(
          w.spec.damage,
          isHeadshot,
          isCrit,
          mods.perkMods,
          damageBoostActive,
        );
        applyDamage(hit.target, finalDamage, isHeadshot);
        results.push({
          target: hit.target,
          damage: finalDamage,
          isHeadshot,
          isCrit,
          point: hit.point,
        });
        this.tracers.spawn(origin, hit.point);
      } else {
        const end = origin.clone().add(this.dir.clone().multiplyScalar(w.spec.range));
        this.tracers.spawn(origin, end);
      }
    }
    return results;
  }

  private raycastTargets(
    targets: readonly HittableTarget[],
  ): { target: HittableTarget; point: Vector3 } | null {
    let best: { target: HittableTarget; point: Vector3; dist: number } | null = null;
    for (const tgt of targets) {
      if (tgt.isDead) continue;
      const meta = tgt.getHitTarget();
      const intersect = this.raycaster.intersectObject(meta.object as never, true);
      if (intersect.length === 0) continue;
      const first = intersect[0];
      if (!first) continue;
      if (!best || first.distance < best.dist) {
        best = { target: tgt, point: first.point.clone(), dist: first.distance };
      }
    }
    return best;
  }

  update(
    input: InputManager,
    targets: readonly HittableTarget[],
    ads = 0,
    fireMods: FireModifiers = {},
  ): HitResult[] {
    this.firedThisFrame = false;
    if (input.wasActionTriggered('WEAPON_1')) this.switchTo(0);
    if (input.wasActionTriggered('WEAPON_2')) this.switchTo(1);
    if (input.wasActionTriggered('WEAPON_3')) this.switchTo(2);
    if (input.wasActionTriggered('WEAPON_PREV')) this.switchPrev();
    if (input.wasActionTriggered('RELOAD')) this.reload();

    this.finishReload();
    this.tracers.update(this.now());
    this.muzzle.update(this.now());

    const w = this.active;
    const wantFire = w.spec.autoFire
      ? input.isActionPressed('FIRE')
      : input.wasActionTriggered('FIRE');
    if (wantFire) {
      const adsFactor = 1 - ads * 0.6;
      const merged: Required<FireModifiers> = {
        perkMods: fireMods.perkMods ?? NEUTRAL_FIRE_MODS.perkMods,
        buffs: fireMods.buffs ?? NEUTRAL_FIRE_MODS.buffs,
        stats: fireMods.stats ?? NEUTRAL_FIRE_MODS.stats,
      };
      return this.fire(targets, adsFactor, merged);
    }
    return [];
  }
}

export interface HitResult {
  target: HittableTarget;
  damage: number;
  isHeadshot: boolean;
  isCrit: boolean;
  point: Vector3;
}
