import Stats from 'stats.js';
import GUI from 'lil-gui';
import type { Game } from '@core/Game';

const isDev = import.meta.env.DEV;

export function attachDebug(game: Game): void {
  if (!isDev) return;

  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.position = 'fixed';
  stats.dom.style.left = '0px';
  stats.dom.style.top = '0px';
  document.body.appendChild(stats.dom);

  const tick = (): void => {
    stats.update();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const gui = new GUI({ title: 'Debug' });
  gui.add(game.cameraController, 'sensitivity', 0.0005, 0.01, 0.0001).name('Mouse Sens');
  gui.add(game.renderer.camera, 'fov', 60, 110, 1).onChange(() => {
    game.renderer.camera.updateProjectionMatrix();
  });
}
