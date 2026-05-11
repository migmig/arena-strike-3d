import {
  Scene,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  Vector3,
  AdditiveBlending,
  PerspectiveCamera,
} from 'three';

const LIFETIME_MS = 60;
const FORWARD_OFFSET = 0.6;
const FLASH_SIZE = 0.6;

function buildFlashTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 240, 180, 1)');
    grad.addColorStop(0.4, 'rgba(255, 180, 60, 0.85)');
    grad.addColorStop(1, 'rgba(255, 80, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(canvas);
}

export class MuzzleFlash {
  private sprite: Sprite;
  private visibleUntil = 0;
  private forward = new Vector3();

  constructor(scene: Scene, private camera: PerspectiveCamera) {
    const tex = buildFlashTexture();
    const mat = new SpriteMaterial({
      map: tex,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.sprite = new Sprite(mat);
    this.sprite.scale.set(FLASH_SIZE, FLASH_SIZE, 1);
    this.sprite.visible = false;
    this.sprite.renderOrder = 999;
    scene.add(this.sprite);
  }

  trigger(now: number): void {
    this.camera.getWorldPosition(this.sprite.position);
    this.camera.getWorldDirection(this.forward);
    this.sprite.position.addScaledVector(this.forward, FORWARD_OFFSET);
    const jitter = 0.85 + Math.random() * 0.3;
    this.sprite.scale.set(FLASH_SIZE * jitter, FLASH_SIZE * jitter, 1);
    this.sprite.material.rotation = Math.random() * Math.PI * 2;
    this.sprite.visible = true;
    this.visibleUntil = now + LIFETIME_MS;
  }

  update(now: number): void {
    if (!this.sprite.visible) return;
    if (now >= this.visibleUntil) {
      this.sprite.visible = false;
    }
  }
}
