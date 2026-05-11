import { Vector3, Raycaster } from 'three';
import type { Scene, PerspectiveCamera } from 'three';
import weaponData from '@data/weapons.json';
import type { RNG } from '@utils/rng';
import type { InputManager } from '@managers/InputManager';
import { TracerPool } from '@entities/Tracer';
import { applyDamage, type Damageable } from './Health';

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

  private tracers: TracerPool;
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

  private fire(targets: readonly HittableTarget[], adsFactor = 1): HitResult[] {
    const w = this.active;
    const t = this.now();
    if (t < w.nextFireAt || w.reloadingUntil > 0) return [];
    if (w.ammoInMag <= 0) {
      this.reload();
      return [];
    }
    w.ammoInMag -= 1;
    w.nextFireAt = t + w.spec.fireRateMs;

    const results: HitResult[] = [];
    const origin = new Vector3();
    this.camera.getWorldPosition(origin);

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
        applyDamage(hit.target, w.spec.damage, isHeadshot);
        results.push({ target: hit.target, damage: w.spec.damage, isHeadshot, point: hit.point });
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
  ): HitResult[] {
    if (input.wasActionTriggered('WEAPON_1')) this.switchTo(0);
    if (input.wasActionTriggered('WEAPON_2')) this.switchTo(1);
    if (input.wasActionTriggered('WEAPON_3')) this.switchTo(2);
    if (input.wasActionTriggered('WEAPON_PREV')) this.switchPrev();
    if (input.wasActionTriggered('RELOAD')) this.reload();

    this.finishReload();
    this.tracers.update(this.now());

    const w = this.active;
    const wantFire = w.spec.autoFire
      ? input.isActionPressed('FIRE')
      : input.wasActionTriggered('FIRE');
    if (wantFire) {
      const adsFactor = 1 - ads * 0.6;
      return this.fire(targets, adsFactor);
    }
    return [];
  }
}

export interface HitResult {
  target: HittableTarget;
  damage: number;
  isHeadshot: boolean;
  point: Vector3;
}
