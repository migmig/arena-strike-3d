import {
  Scene,
  Mesh,
  Vector3,
  OctahedronGeometry,
  MeshStandardMaterial,
  PointLight,
} from 'three';
import pickupData from '@data/pickups.json';
import type { RNG } from '@utils/rng';
import type { PlayerStats } from './Health';
import { healPlayer } from './Health';
import type { WeaponSystem } from './WeaponSystem';

export type PickupId =
  | 'ammo_small'
  | 'ammo_large'
  | 'health'
  | 'damage_boost'
  | 'quad_speed';

interface PickupTypeDef {
  id: PickupId;
  label: string;
  color: string;
  respawnMs: number;
}

interface PickupNode {
  pos: Vector3;
  active: boolean;
  type: PickupTypeDef;
  mesh: Mesh;
  light: PointLight;
  respawnAt: number;
}

export interface ActiveBuff {
  id: 'damage_boost' | 'quad_speed';
  expiresAt: number;
}

const PICKUP_HEIGHT = 0.8;
const PICKUP_RADIUS = 0.5;
const TYPES = pickupData.types as PickupTypeDef[];
const SPAWNS = pickupData.spawnPoints as ReadonlyArray<{ x: number; z: number }>;

export class PickupSystem {
  private nodes: PickupNode[] = [];

  constructor(
    private scene: Scene,
    private rng: RNG,
  ) {
    for (const s of SPAWNS) {
      const type = this.rng.pick(TYPES);
      const node = this.createNode(s.x, s.z, type);
      this.nodes.push(node);
    }
  }

  private createNode(x: number, z: number, type: PickupTypeDef): PickupNode {
    const mat = new MeshStandardMaterial({
      color: Number(type.color),
      emissive: Number(type.color),
      emissiveIntensity: 0.6,
    });
    const mesh = new Mesh(new OctahedronGeometry(PICKUP_RADIUS), mat);
    mesh.position.set(x, PICKUP_HEIGHT, z);
    this.scene.add(mesh);
    const light = new PointLight(Number(type.color), 0.8, 4);
    light.position.copy(mesh.position);
    this.scene.add(light);
    return { pos: mesh.position, active: true, type, mesh, light, respawnAt: 0 };
  }

  update(
    deltaTime: number,
    now: number,
    playerPos: Vector3,
    stats: PlayerStats,
    weapons: WeaponSystem,
    activeBuffs: ActiveBuff[],
  ): PickupId | null {
    let pickedId: PickupId | null = null;
    for (const node of this.nodes) {
      if (node.active) {
        node.mesh.rotation.y += deltaTime * 1.6;
        if (playerPos.distanceTo(node.pos) < 1.2) {
          this.collect(node, stats, weapons, activeBuffs, now);
          pickedId = node.type.id;
        }
      } else if (now >= node.respawnAt) {
        node.type = this.rng.pick(TYPES);
        (node.mesh.material as MeshStandardMaterial).color.set(Number(node.type.color));
        (node.mesh.material as MeshStandardMaterial).emissive.set(Number(node.type.color));
        node.light.color.set(Number(node.type.color));
        node.mesh.visible = true;
        node.light.visible = true;
        node.active = true;
      }
    }
    for (let i = activeBuffs.length - 1; i >= 0; i--) {
      const buff = activeBuffs[i];
      if (buff && buff.expiresAt <= now) activeBuffs.splice(i, 1);
    }
    return pickedId;
  }

  private collect(
    node: PickupNode,
    stats: PlayerStats,
    weapons: WeaponSystem,
    buffs: ActiveBuff[],
    now: number,
  ): void {
    switch (node.type.id) {
      case 'ammo_small': {
        const w = weapons.active;
        if (!w.spec.unlimitedReserve) w.reserve += Math.ceil(w.spec.magSize * 0.5);
        break;
      }
      case 'ammo_large': {
        for (const s of weapons.slots) {
          if (s.spec.unlimitedReserve) s.ammoInMag = s.spec.magSize;
          else s.reserve += s.spec.magSize * 2;
        }
        break;
      }
      case 'health':
        healPlayer(stats, 40);
        break;
      case 'damage_boost':
        buffs.push({ id: 'damage_boost', expiresAt: now + 10000 });
        break;
      case 'quad_speed':
        buffs.push({ id: 'quad_speed', expiresAt: now + 8000 });
        break;
    }
    node.active = false;
    node.mesh.visible = false;
    node.light.visible = false;
    node.respawnAt = now + node.type.respawnMs;
  }
}
