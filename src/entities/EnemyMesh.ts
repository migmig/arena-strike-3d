import {
  Group,
  Mesh,
  Object3D,
  BoxGeometry,
  CylinderGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  MeshStandardMaterial,
  PointLight,
} from 'three';
import type { EnemyKind } from '@systems/ScoreSystem';

export interface EnemyVisual {
  root: Group;
  /** Bobbing / breathing parts */
  bobTarget: Object3D;
  /** Parts that get tinted on damage flash */
  bodyMaterials: MeshStandardMaterial[];
  /** Glowing core to pulse */
  core: MeshStandardMaterial;
  light: PointLight;
  height: number;
}

const OUTLINE_MAT = new LineBasicMaterial({ color: 0x111118, linewidth: 1 });

function addOutline(group: Object3D, mesh: Mesh): void {
  const edges = new EdgesGeometry(mesh.geometry, 30);
  const lines = new LineSegments(edges, OUTLINE_MAT);
  lines.position.copy(mesh.position);
  lines.rotation.copy(mesh.rotation);
  lines.scale.copy(mesh.scale);
  group.add(lines);
}

function makeBody(color: number, emissive: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.35,
    metalness: 0.1,
    roughness: 0.55,
  });
}

export function createEnemyVisual(kind: EnemyKind, baseColor: number): EnemyVisual {
  switch (kind) {
    case 'shooter':
      return buildShooter(baseColor);
    case 'charger':
      return buildCharger(baseColor);
    case 'boss':
      return buildBoss(baseColor);
    case 'grunt':
    default:
      return buildGrunt(baseColor);
  }
}

function buildGrunt(color: number): EnemyVisual {
  const root = new Group();
  const bodyMat = makeBody(color, color);
  const bodyMaterials = [bodyMat];

  const torso = new Mesh(new BoxGeometry(0.85, 0.85, 0.7), bodyMat);
  torso.position.y = 1.0;
  root.add(torso);
  addOutline(root, torso);

  const head = new Mesh(new BoxGeometry(0.55, 0.55, 0.55), bodyMat);
  head.position.y = 1.65;
  root.add(head);
  addOutline(root, head);

  const eyeMat = new MeshStandardMaterial({
    color: 0xff5040,
    emissive: 0xff3020,
    emissiveIntensity: 1.6,
  });
  const eyeL = new Mesh(new BoxGeometry(0.12, 0.08, 0.04), eyeMat);
  eyeL.position.set(-0.13, 1.7, 0.28);
  root.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.13;
  root.add(eyeR);

  const armGeom = new BoxGeometry(0.22, 0.7, 0.22);
  const armL = new Mesh(armGeom, bodyMat);
  armL.position.set(-0.55, 1.05, 0);
  root.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.55;
  root.add(armR);

  const legGeom = new BoxGeometry(0.28, 0.6, 0.28);
  const legL = new Mesh(legGeom, bodyMat);
  legL.position.set(-0.18, 0.3, 0);
  root.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.18;
  root.add(legR);

  const core = new MeshStandardMaterial({
    color: 0xff8040,
    emissive: 0xff5020,
    emissiveIntensity: 1.2,
  });
  const coreMesh = new Mesh(new SphereGeometry(0.12, 12, 12), core);
  coreMesh.position.set(0, 1.05, 0.36);
  root.add(coreMesh);

  const light = new PointLight(color, 0.8, 3);
  light.position.set(0, 1.4, 0);
  root.add(light);

  return { root, bobTarget: root, bodyMaterials, core, light, height: 2.0 };
}

function buildShooter(color: number): EnemyVisual {
  const root = new Group();
  const bodyMat = makeBody(color, color);
  const bodyMaterials = [bodyMat];

  const torso = new Mesh(new CylinderGeometry(0.45, 0.5, 1.2, 8), bodyMat);
  torso.position.y = 1.0;
  root.add(torso);
  addOutline(root, torso);

  const head = new Mesh(new SphereGeometry(0.35, 16, 12), bodyMat);
  head.position.y = 1.85;
  root.add(head);

  const antennaMat = new MeshStandardMaterial({
    color: 0xfff0a0,
    emissive: 0xffd060,
    emissiveIntensity: 1.4,
  });
  const antenna = new Mesh(new CylinderGeometry(0.03, 0.03, 0.5, 6), antennaMat);
  antenna.position.y = 2.3;
  root.add(antenna);
  const bulb = new Mesh(new SphereGeometry(0.1, 10, 8), antennaMat);
  bulb.position.y = 2.6;
  root.add(bulb);

  const gunMat = new MeshStandardMaterial({ color: 0x303034, metalness: 0.6, roughness: 0.3 });
  const gun = new Mesh(new BoxGeometry(0.18, 0.18, 0.7), gunMat);
  gun.position.set(0.4, 1.1, 0.25);
  root.add(gun);

  const core = new MeshStandardMaterial({
    color: 0xfff0a0,
    emissive: 0xffd060,
    emissiveIntensity: 1.3,
  });
  const coreMesh = new Mesh(new SphereGeometry(0.18, 12, 12), core);
  coreMesh.position.set(0, 1.2, 0.45);
  root.add(coreMesh);

  const light = new PointLight(0xffd060, 1.0, 3.5);
  light.position.set(0, 1.5, 0);
  root.add(light);

  return { root, bobTarget: root, bodyMaterials, core, light, height: 2.4 };
}

function buildCharger(color: number): EnemyVisual {
  const root = new Group();
  const bodyMat = makeBody(color, color);
  const bodyMaterials = [bodyMat];

  const torso = new Mesh(new IcosahedronGeometry(0.7, 1), bodyMat);
  torso.position.y = 1.0;
  root.add(torso);
  addOutline(root, torso);

  const spikeGeom = new ConeGeometry(0.14, 0.5, 6);
  const spikePositions: Array<[number, number, number, number, number, number]> = [
    [0, 1.7, 0, 0, 0, 0],
    [0.6, 1.2, 0, 0, 0, -Math.PI / 2],
    [-0.6, 1.2, 0, 0, 0, Math.PI / 2],
    [0, 1.2, 0.6, Math.PI / 2, 0, 0],
    [0, 1.2, -0.6, -Math.PI / 2, 0, 0],
    [0.45, 0.7, 0.45, Math.PI / 3, 0, -Math.PI / 4],
    [-0.45, 0.7, -0.45, -Math.PI / 3, 0, Math.PI / 4],
  ];
  for (const [x, y, z, rx, ry, rz] of spikePositions) {
    const spike = new Mesh(spikeGeom, bodyMat);
    spike.position.set(x, y, z);
    spike.rotation.set(rx, ry, rz);
    root.add(spike);
  }

  const core = new MeshStandardMaterial({
    color: 0xff60ff,
    emissive: 0xa030d0,
    emissiveIntensity: 2.4,
  });
  const coreMesh = new Mesh(new SphereGeometry(0.22, 16, 12), core);
  coreMesh.position.y = 1.0;
  root.add(coreMesh);

  const legGeom = new ConeGeometry(0.12, 0.5, 5);
  for (const [x, z] of [
    [-0.3, 0.3],
    [0.3, 0.3],
    [-0.3, -0.3],
    [0.3, -0.3],
  ] as Array<[number, number]>) {
    const leg = new Mesh(legGeom, bodyMat);
    leg.position.set(x, 0.25, z);
    leg.rotation.x = Math.PI;
    root.add(leg);
  }

  const light = new PointLight(0xff40ff, 1.4, 4);
  light.position.set(0, 1.0, 0);
  root.add(light);

  return { root, bobTarget: root, bodyMaterials, core, light, height: 1.8 };
}

function buildBoss(color: number): EnemyVisual {
  const root = new Group();
  const bodyMat = new MeshStandardMaterial({
    color,
    emissive: 0x802020,
    emissiveIntensity: 0.5,
    metalness: 0.35,
    roughness: 0.4,
  });
  const torso = new Mesh(new IcosahedronGeometry(1.4, 1), bodyMat);
  torso.position.y = 1.6;
  root.add(torso);

  const core = new MeshStandardMaterial({
    color: 0xff8080,
    emissive: 0xff3030,
    emissiveIntensity: 2.6,
  });
  const coreMesh = new Mesh(new SphereGeometry(0.38, 18, 14), core);
  coreMesh.position.y = 1.6;
  root.add(coreMesh);

  const light = new PointLight(0xff4040, 2.2, 6);
  light.position.set(0, 1.6, 0);
  root.add(light);

  return { root, bobTarget: torso, bodyMaterials: [bodyMat], core, light, height: 3.2 };
}

export function disposeVisual(visual: EnemyVisual): void {
  visual.root.traverse((obj) => {
    if (obj instanceof Mesh || obj instanceof LineSegments) {
      obj.geometry.dispose();
    }
  });
  for (const m of visual.bodyMaterials) m.dispose();
  visual.core.dispose();
}
