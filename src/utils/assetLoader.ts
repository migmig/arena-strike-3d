import { Group, Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { fetchWithRetry, type LoadRetryOptions } from './loadWithRetry';

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

let sharedGltfLoader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (sharedGltfLoader) return sharedGltfLoader;
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_DECODER_PATH);
  loader.setDRACOLoader(draco);
  sharedGltfLoader = loader;
  return loader;
}

export interface ModelLoadOptions extends LoadRetryOptions {
  /** Uniform scale applied after load. */
  scale?: number;
  /** Y-axis translation applied after load (use to place feet at origin). */
  groundOffsetY?: number;
}

/**
 * Load a glTF/glb model from `/models/*.glb` with retry + Draco support.
 * Drop CC0 models into `public/models/` and reference them as `models/<name>.glb`.
 */
export async function loadModel(
  relativeUrl: string,
  opts: ModelLoadOptions = {},
): Promise<{ scene: Group; gltf: GLTF }> {
  const url = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  const res = await fetchWithRetry(url, undefined, opts);
  const buffer = await res.arrayBuffer();
  const loader = getLoader();
  const gltf = await new Promise<GLTF>((resolve, reject) => {
    loader.parse(buffer, '', resolve, reject);
  });
  const scene = gltf.scene;
  if (opts.scale && opts.scale !== 1) scene.scale.setScalar(opts.scale);
  if (opts.groundOffsetY) scene.position.y += opts.groundOffsetY;
  scene.traverse((obj: Object3D) => {
    obj.castShadow = false;
    obj.receiveShadow = false;
  });
  return { scene, gltf };
}

export interface AssetManifestEntry {
  /** Relative URL under `public/` (e.g. `models/enemy_grunt.glb`). */
  url: string;
  scale?: number;
  groundOffsetY?: number;
  /** Used by EnemyMesh / Viewmodel etc. to bind to a logical slot. */
  slot: string;
}

/**
 * Drop-in registry. Populate via `setAssetManifest()` at boot when external
 * CC0 models are available; otherwise procedural fallbacks are used.
 */
let MANIFEST: AssetManifestEntry[] = [];

export function setAssetManifest(entries: AssetManifestEntry[]): void {
  MANIFEST = entries.slice();
}

export function findAsset(slot: string): AssetManifestEntry | undefined {
  return MANIFEST.find((e) => e.slot === slot);
}

export function listAssets(): readonly AssetManifestEntry[] {
  return MANIFEST;
}
