import {
  CanvasTexture,
  RepeatWrapping,
  type Texture,
} from 'three';

function makeCanvas(size: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return { c, ctx };
}

function noise(ctx: CanvasRenderingContext2D, size: number, amount: number, rgb: [number, number, number]): void {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, (d[i] ?? rgb[0]) + r));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] ?? rgb[1]) + r));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] ?? rgb[2]) + r));
  }
  ctx.putImageData(img, 0, 0);
}

/** Dark concrete / asphalt for the arena floor. */
export function buildGroundTexture(repeat = 14): Texture {
  const size = 256;
  const { c, ctx } = makeCanvas(size);
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 30, [42, 42, 50]);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 16; i < size; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

/** Brushed metal panels for arena walls. */
export function buildWallTexture(repeatX = 8, repeatY = 1): Texture {
  const size = 256;
  const { c, ctx } = makeCanvas(size);
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#3a3a44');
  grad.addColorStop(0.5, '#2c2c34');
  grad.addColorStop(1, '#3a3a44');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 12, [50, 50, 60]);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,210,90,0.35)';
  for (let x = 16; x < size; x += 64) {
    ctx.fillRect(x, 4, 4, 4);
    ctx.fillRect(x, size - 8, 4, 4);
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

/** Industrial striped metal for cover crates. */
export function buildCoverTexture(): Texture {
  const size = 128;
  const { c, ctx } = makeCanvas(size);
  ctx.fillStyle = '#5a5a70';
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 18, [90, 90, 112]);
  ctx.fillStyle = 'rgba(255,210,90,0.85)';
  for (let y = 0; y < size; y += 32) {
    for (let x = -size; x < size; x += 24) {
      ctx.save();
      ctx.translate(x + (y % 64), y);
      ctx.rotate(-Math.PI / 6);
      ctx.fillRect(0, 0, 14, 8);
      ctx.restore();
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = 4;
  return tex;
}
