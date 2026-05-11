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
} from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

interface Cover {
  x: number;
  z: number;
  size: number;
}

const COVERS: Cover[] = [
  { x: -8, z: -6, size: 2 },
  { x: 7, z: -7, size: 2 },
  { x: -5, z: 8, size: 2 },
  { x: 9, z: 5, size: 2 },
  { x: 0, z: 0, size: 1.5 },
  { x: -10, z: 2, size: 2 },
  { x: 4, z: -3, size: 1.8 },
];

const ARENA_HALF = 15;

export function buildArena(scene: Scene, world: RAPIER.World): void {
  const groundMat = new MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.9 });
  const ground = new Mesh(new PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new GridHelper(ARENA_HALF * 2, 30, 0x4a4a55, 0x3a3a45);
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
  for (const [tx, tz, sx, sz] of walls) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(sx, wallH / 2, sz).setTranslation(tx, wallH / 2, tz),
    );
  }

  const coverGeom = new BoxGeometry(1, 1, 1);
  const coverMat = new MeshStandardMaterial({ color: 0x6a6a85, roughness: 0.7 });
  const instanced = new InstancedMesh(coverGeom, coverMat, COVERS.length);
  const dummy = new Object3D();
  const matrix = new Matrix4();
  for (let i = 0; i < COVERS.length; i++) {
    const c = COVERS[i] as Cover;
    dummy.position.set(c.x, c.size / 2, c.z);
    dummy.scale.set(c.size, c.size, c.size);
    dummy.updateMatrix();
    matrix.copy(dummy.matrix);
    instanced.setMatrixAt(i, matrix);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(c.size / 2, c.size / 2, c.size / 2).setTranslation(
        c.x,
        c.size / 2,
        c.z,
      ),
    );
  }
  instanced.instanceMatrix.needsUpdate = true;
  scene.add(instanced);
}
