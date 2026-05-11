import {
  Group,
  Mesh,
  Object3D,
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  Vector3,
  MathUtils,
  type PerspectiveCamera,
} from 'three';
import type { WeaponId } from '@systems/WeaponSystem';

interface WeaponMesh {
  group: Group;
  recoilBone: Object3D;
}

const HIP_OFFSET = new Vector3(0.22, -0.18, -0.55);
const ADS_OFFSET = new Vector3(0.0, -0.05, -0.42);

function buildPistol(): WeaponMesh {
  const group = new Group();
  const recoilBone = new Object3D();
  group.add(recoilBone);
  const bodyMat = new MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.35 });
  const gripMat = new MeshStandardMaterial({ color: 0x222226, metalness: 0.2, roughness: 0.85 });

  const slide = new Mesh(new BoxGeometry(0.07, 0.07, 0.32), bodyMat);
  slide.position.set(0, 0, -0.05);
  recoilBone.add(slide);

  const barrel = new Mesh(new CylinderGeometry(0.018, 0.018, 0.08, 12), bodyMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -0.23);
  recoilBone.add(barrel);

  const grip = new Mesh(new BoxGeometry(0.07, 0.16, 0.08), gripMat);
  grip.position.set(0, -0.11, 0.04);
  grip.rotation.x = -0.2;
  recoilBone.add(grip);

  const sight = new Mesh(new BoxGeometry(0.015, 0.02, 0.015), bodyMat);
  sight.position.set(0, 0.05, -0.18);
  recoilBone.add(sight);
  return { group, recoilBone };
}

function buildSmg(): WeaponMesh {
  const group = new Group();
  const recoilBone = new Object3D();
  group.add(recoilBone);
  const bodyMat = new MeshStandardMaterial({ color: 0x35353a, metalness: 0.55, roughness: 0.4 });
  const accentMat = new MeshStandardMaterial({ color: 0xffd060, emissive: 0x553010, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.3 });

  const receiver = new Mesh(new BoxGeometry(0.08, 0.08, 0.42), bodyMat);
  receiver.position.set(0, 0, -0.1);
  recoilBone.add(receiver);

  const barrel = new Mesh(new CylinderGeometry(0.022, 0.022, 0.16, 12), bodyMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -0.35);
  recoilBone.add(barrel);

  const mag = new Mesh(new BoxGeometry(0.06, 0.18, 0.06), accentMat);
  mag.position.set(0, -0.12, -0.05);
  recoilBone.add(mag);

  const grip = new Mesh(new BoxGeometry(0.06, 0.14, 0.07), bodyMat);
  grip.position.set(0, -0.1, 0.08);
  grip.rotation.x = -0.15;
  recoilBone.add(grip);

  const sight = new Mesh(new BoxGeometry(0.012, 0.025, 0.06), bodyMat);
  sight.position.set(0, 0.06, -0.18);
  recoilBone.add(sight);
  return { group, recoilBone };
}

function buildShotgun(): WeaponMesh {
  const group = new Group();
  const recoilBone = new Object3D();
  group.add(recoilBone);
  const bodyMat = new MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.7, metalness: 0.2 });
  const metalMat = new MeshStandardMaterial({ color: 0x202024, metalness: 0.8, roughness: 0.3 });

  const stock = new Mesh(new BoxGeometry(0.07, 0.09, 0.22), bodyMat);
  stock.position.set(0, -0.02, 0.1);
  recoilBone.add(stock);

  const receiver = new Mesh(new BoxGeometry(0.07, 0.08, 0.2), metalMat);
  receiver.position.set(0, 0, -0.12);
  recoilBone.add(receiver);

  const barrel = new Mesh(new CylinderGeometry(0.025, 0.025, 0.38, 12), metalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.38);
  recoilBone.add(barrel);

  const pump = new Mesh(new BoxGeometry(0.07, 0.05, 0.08), bodyMat);
  pump.position.set(0, -0.05, -0.22);
  recoilBone.add(pump);

  const sight = new Mesh(new BoxGeometry(0.012, 0.018, 0.012), metalMat);
  sight.position.set(0, 0.05, -0.5);
  recoilBone.add(sight);
  return { group, recoilBone };
}

const BUILDERS: Record<WeaponId, () => WeaponMesh> = {
  pistol: buildPistol,
  smg: buildSmg,
  shotgun: buildShotgun,
};

export class Viewmodel {
  readonly root: Group;
  private meshes: Record<WeaponId, WeaponMesh>;
  private current: WeaponId = 'pistol';
  private recoilT = 0;
  private bobT = 0;
  visible = true;

  constructor(private camera: PerspectiveCamera) {
    this.root = new Group();
    this.root.renderOrder = 100;
    camera.add(this.root);

    this.meshes = {
      pistol: BUILDERS.pistol(),
      smg: BUILDERS.smg(),
      shotgun: BUILDERS.shotgun(),
    };
    for (const k of Object.keys(this.meshes) as WeaponId[]) {
      this.meshes[k].group.visible = false;
      this.root.add(this.meshes[k].group);
    }
    this.meshes[this.current].group.visible = true;
    this.root.position.copy(HIP_OFFSET);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.visible = visible;
  }

  setWeapon(id: WeaponId): void {
    if (this.current === id) return;
    this.meshes[this.current].group.visible = false;
    this.current = id;
    this.meshes[this.current].group.visible = true;
  }

  triggerRecoil(): void {
    this.recoilT = 1;
  }

  setMode(thirdPerson: boolean): void {
    this.root.visible = this.visible && !thirdPerson;
  }

  update(deltaTime: number, ads: number, moveSpeed: number): void {
    if (!this.root.visible) return;
    this.recoilT = Math.max(0, this.recoilT - deltaTime * 9);
    const bone = this.meshes[this.current].recoilBone;
    bone.position.z = this.recoilT * 0.04;
    bone.rotation.x = -this.recoilT * 0.15;

    this.bobT += deltaTime * (4 + moveSpeed * 1.2);
    const bobAmt = MathUtils.lerp(0.012, 0.002, ads) * Math.min(1, moveSpeed / 4);

    const targetOffset = new Vector3().lerpVectors(HIP_OFFSET, ADS_OFFSET, ads);
    targetOffset.x += Math.cos(this.bobT) * bobAmt * 0.5;
    targetOffset.y += Math.abs(Math.sin(this.bobT)) * bobAmt;
    this.root.position.lerp(targetOffset, Math.min(1, deltaTime * 12));
  }
}
