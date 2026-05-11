export class Overlay {
  private root: HTMLDivElement;
  private title: HTMLDivElement;
  private body: HTMLDivElement;
  private actions: HTMLDivElement;

  constructor(parent: HTMLElement, id: string) {
    this.root = document.createElement('div');
    this.root.id = id;
    this.root.innerHTML = `
      <style>
        .overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.78);
          display: none; align-items: center; justify-content: center;
          z-index: 25; font-family: system-ui, sans-serif; color: #fff;
        }
        .overlay.active { display: flex; }
        .overlay-card {
          background: rgba(30,30,40,0.95); border: 1px solid #555;
          padding: 32px 48px; border-radius: 12px; min-width: 320px; text-align: center;
        }
        .overlay-title { font-size: 28px; font-weight: 700; margin-bottom: 16px; letter-spacing: 1px; }
        .overlay-body { font-size: 16px; line-height: 1.6; margin-bottom: 24px; opacity: 0.9; }
        .overlay-actions { display: flex; gap: 12px; justify-content: center; }
        .overlay-btn {
          padding: 10px 24px; background: #4a4a60; border: 1px solid #777;
          color: #fff; cursor: pointer; border-radius: 4px; font-size: 14px;
        }
        .overlay-btn:hover { background: #5a5a75; border-color: #ffd060; }
      </style>
      <div class="overlay-card">
        <div class="overlay-title"></div>
        <div class="overlay-body"></div>
        <div class="overlay-actions"></div>
      </div>
    `;
    this.root.classList.add('overlay');
    parent.appendChild(this.root);
    this.title = this.root.querySelector('.overlay-title') as HTMLDivElement;
    this.body = this.root.querySelector('.overlay-body') as HTMLDivElement;
    this.actions = this.root.querySelector('.overlay-actions') as HTMLDivElement;
  }

  show(title: string, bodyHtml: string, buttons: Array<{ label: string; onClick: () => void }>): void {
    this.title.textContent = title;
    this.body.innerHTML = bodyHtml;
    this.actions.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = 'overlay-btn';
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      this.actions.appendChild(btn);
    }
    this.root.classList.add('active');
  }

  hide(): void {
    this.root.classList.remove('active');
  }

  destroy(): void {
    this.root.remove();
  }
}
