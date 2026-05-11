export class Credits {
  private root: HTMLDivElement;

  constructor(parent: HTMLElement, private onClose: () => void) {
    this.root = document.createElement('div');
    this.root.id = 'credits-overlay';
    this.root.innerHTML = `
      <style>
        #credits-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.92);
          display: none; align-items: center; justify-content: center;
          z-index: 40; font-family: system-ui, sans-serif; color: #fff;
        }
        #credits-overlay.active { display: flex; }
        .credits-card {
          background: rgba(28,28,38,0.96); border: 1px solid #555; border-radius: 10px;
          width: 560px; max-height: 80vh; overflow-y: auto;
          padding: 32px 40px; text-align: left;
        }
        .credits-title { font-size: 26px; font-weight: 700; letter-spacing: 2px; text-align: center; margin-bottom: 18px; color: #ffd060; }
        .credits-section { margin: 14px 0; }
        .credits-section h3 { font-size: 15px; margin: 0 0 6px; color: #ffd060; }
        .credits-section ul { list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 1.6; opacity: 0.9; }
        .credits-close {
          display: block; margin: 18px auto 0; padding: 8px 24px;
          background: #ffd060; color: #222; border: none; border-radius: 4px;
          cursor: pointer; font-size: 14px; font-weight: 600;
        }
      </style>
      <div class="credits-card">
        <div class="credits-title">Arena Strike 3D</div>
        <div class="credits-section">
          <h3>Game</h3>
          <ul>
            <li>Design / Code — Arena Strike 3D contributors</li>
            <li>Built with TypeScript, Vite, Three.js, Rapier, Howler</li>
          </ul>
        </div>
        <div class="credits-section">
          <h3>Engine &amp; Libraries</h3>
          <ul>
            <li>Three.js — MIT — mrdoob &amp; contributors</li>
            <li>@dimforge/rapier3d-compat — Apache-2.0 — Rapier contributors</li>
            <li>Howler.js — MIT — GoldFire Studios</li>
            <li>seedrandom — MIT — David Bau</li>
            <li>stats.js — MIT — mrdoob</li>
            <li>lil-gui — MIT — George Michael Brower</li>
          </ul>
        </div>
        <div class="credits-section">
          <h3>Audio</h3>
          <ul>
            <li>All SFX procedurally generated via Web Audio API</li>
            <li>No external samples shipped</li>
          </ul>
        </div>
        <div class="credits-section">
          <h3>Assets</h3>
          <ul>
            <li>Geometry — primitive shapes (procedural, MIT)</li>
            <li>Fonts — system-ui (host OS default)</li>
            <li>Detailed attributions: see ASSETS.md in the repository</li>
          </ul>
        </div>
        <div class="credits-section">
          <h3>Thanks</h3>
          <ul>
            <li>The Three.js, Rapier, and Web Audio communities</li>
            <li>You, for playing</li>
          </ul>
        </div>
        <button class="credits-close" id="credits-close">Close</button>
      </div>
    `;
    parent.appendChild(this.root);
    (this.root.querySelector('#credits-close') as HTMLButtonElement).addEventListener('click', () => this.close());
  }

  open(): void {
    this.root.classList.add('active');
  }

  close(): void {
    this.root.classList.remove('active');
    this.onClose();
  }

  isOpen(): boolean {
    return this.root.classList.contains('active');
  }

  destroy(): void {
    this.root.remove();
  }
}
