export class Vignette {
  private root: HTMLDivElement;
  private flashTimer = 0;
  private hpRatio = 1;
  private reduceMotion = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.innerHTML = `
      <style>
        #vignette-hit, #vignette-low {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          transition: opacity 0.15s;
        }
        #vignette-hit {
          box-shadow: inset 0 0 200px 60px rgba(255,40,40,0.85);
        }
        #vignette-low {
          box-shadow: inset 0 0 240px 80px rgba(255,40,40,0.55);
        }
        #vignette-low.active {
          animation: vignette-pulse 1.2s infinite alternate;
        }
        @keyframes vignette-pulse {
          from { opacity: 0.35; }
          to { opacity: 0.75; }
        }
      </style>
      <div id="vignette-hit"></div>
      <div id="vignette-low"></div>
    `;
    this.root.style.position = 'absolute';
    this.root.style.inset = '0';
    this.root.style.pointerEvents = 'none';
    parent.appendChild(this.root);
  }

  pulse(): void {
    this.flashTimer = 150;
    (this.root.querySelector('#vignette-hit') as HTMLDivElement).style.opacity = '1';
  }

  setHpRatio(ratio: number): void {
    this.hpRatio = ratio;
    const low = this.root.querySelector('#vignette-low') as HTMLDivElement;
    const critical = ratio < 0.3;
    low.classList.toggle('active', critical && !this.reduceMotion);
    low.style.opacity = critical && this.reduceMotion ? '0.55' : '';
  }

  setReduceMotion(enabled: boolean): void {
    this.reduceMotion = enabled;
    this.setHpRatio(this.hpRatio);
  }

  update(deltaMs: number): void {
    void this.hpRatio;
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaMs;
      if (this.flashTimer <= 0) {
        (this.root.querySelector('#vignette-hit') as HTMLDivElement).style.opacity = '0';
      }
    }
  }

  destroy(): void {
    this.root.remove();
  }
}
