import { Game } from '@core/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const clickToPlay = document.getElementById('click-to-play');

if (!canvas) throw new Error('canvas element not found');

window.addEventListener('error', (e) => {
  console.error('Global error:', e.message, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});

const game = new Game(canvas);

async function bootstrap(): Promise<void> {
  await game.init();
  game.start();

  clickToPlay?.addEventListener('click', () => {
    game.input.requestPointerLock();
    game.audio.ensureContext();
    game.audio.startBgm();
    clickToPlay?.classList.add('hidden');
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== document.body) {
      clickToPlay?.classList.remove('hidden');
    }
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  if (clickToPlay) {
    clickToPlay.textContent = 'Failed to load. Reload page.';
  }
});
