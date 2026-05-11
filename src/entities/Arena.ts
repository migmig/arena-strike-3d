import {
  Scene,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  MeshStandardMaterial,
  GridHelper,
  InstancedMesh,
  Matrix4,
  Object3D,
  Box3,
  Vector3,
} from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { buildGroundTexture, buildWallTexture, buildCoverTexture } from './ProceduralTextures';

interface Cover {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

const COVERS: Cover[] = [
  { x: -14, z: -10, w: 3, h: 2, d: 3 },
  { x: 14, z: -12, w: 3, h: 2.5, d: 3 },
  { x: -8, z: 14, w: 2.5, h: 2, d: 4 },
  { x: 16, z: 8, w: 3, h: 2, d: 2 },
  { x: 0, z: 0, w: 2, h: 1.5, d: 2 },
  { x: -18, z: 4, w: 2, h: 3, d: 2 },
  { x: 6, z: -5, w: 1.5, h: 2, d: 5 },
  { x: -5, z: -16, w: 4, h: 2, d: 1.5 },
  { x: 10, z: 18, w: 3, h: 2.5, d: 1.5 },
  { x: -16, z: -18, w: 2.5, h: 2, d: 2.5 },
  { x: 18, z: -18, w: 2.5, h: 2, d: 2.5 },
  { x: -2, z: 8, w: 1.5, h: 1.2, d: 3 },
];

export const ARENA_HALF = 25;

export interface ArenaResult {
  obstacles: Box3[];
}

export function buildArena(scene: Scene, world: RAPIER.World): ArenaResult {
  const groundMat = new MeshStandardMaterial({
    color: 0xffffff,
    map: buildGroundTexture(14),
    roughness: 0.92,
    metalness: 0.05,
  });
  const ground = new Mesh(new PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new GridHelper(ARENA_HALF * 2, 50, 0x4a4a55, 0x3a3a45);
  const gridMat = grid.material as { transparent: boolean; opacity: number };
  gridMat.transparent = true;
  gridMat.opacity = 0.35;
  scene.add(grid);

  world.createCollider(
    RAPIER.ColliderDesc.cuboid(ARENA_HALF, 0.1, ARENA_HALF).setTranslation(0, -0.1, 0),
  );

  const wallH = 4;
  const walls: Array<[number, number, number, number]> = [
    [0, ARENA_HALF, ARENA_HALF, 0.5],
    [0, -ARENA_HALF, ARENA_HALF, 0.5],
    [ARENA_HALF, 0, 0.5, ARENA_HALF],
    [-ARENA_HALF, 0, 0.5, ARENA_HALF],
  ];
  const wallTexLR = buildWallTexture(1, 1);
  wallTexLR.repeat.set(Math.round(ARENA_HALF * 2 / 4), 1);
  const wallTexFB = buildWallTexture(1, 1);
  wallTexFB.repeat.set(Math.round(ARENA_HALF * 2 / 4), 1);
  const wallMat = new MeshStandardMaterial({
    color: 0xffffff,
    map: wallTexLR,
    roughness: 0.7,
    metalness: 0.25,
  });
  for (const [tx, tz, sx, sz] of walls) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(sx, wallH / 2, sz).setTranslation(tx, wallH / 2, tz),
    );
    const wallMesh = new Mesh(new BoxGeometry(sx * 2, wallH, sz * 2), wallMat);
    wallMesh.position.set(tx, wallH / 2, tz);
    scene.add(wallMesh);
  }

  const coverGeom = new BoxGeometry(1, 1, 1);
  const coverMat = new MeshStandardMaterial({
    color: 0xffffff,
    map: buildCoverTexture(),
    roughness: 0.65,
    metalness: 0.2,
  });
  const instanced = new InstancedMesh(coverGeom, coverMat, COVERS.length);
  const dummy = new Object3D();
  const matrix = new Matrix4();
  const obstacles: Box3[] = [];
  for (let i = 0; i < COVERS.length; i++) {
    const c = COVERS[i] as Cover;
    dummy.position.set(c.x, c.h / 2, c.z);
    dummy.scale.set(c.w, c.h, c.d);
    dummy.updateMatrix();
    matrix.copy(dummy.matrix);
    instanced.setMatrixAt(i, matrix);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(c.w / 2, c.h / 2, c.d / 2).setTranslation(c.x, c.h / 2, c.z),
    );
    obstacles.push(
      new Box3(
        new Vector3(c.x - c.w / 2, 0, c.z - c.d / 2),
        new Vector3(c.x + c.w / 2, c.h, c.z + c.d / 2),
      ),
    );
  }
  instanced.instanceMatrix.needsUpdate = true;
  scene.add(instanced);

  return { obstacles };
}
