import type { PerkDef, PerkId } from '@systems/PerkSystem';

export class PerkSelect {
  private root: HTMLDivElement;
  private resolver: ((id: PerkId) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'perk-select';
    this.root.innerHTML = `
      <style>
        #perk-select {
          position: absolute; inset: 0; background: rgba(0,0,0,0.75);
          display: none; align-items: center; justify-content: center;
          z-index: 30; font-family: system-ui, sans-serif; color: #fff;
        }
        #perk-select.active { display: flex; }
        .perk-wrap { text-align: center; }
        .perk-title { font-size: 28px; margin-bottom: 24px; letter-spacing: 2px; }
        .perk-cards { display: flex; gap: 18px; }
        .perk-card {
          width: 200px; padding: 24px 18px; background: rgba(40,40,55,0.95);
          border: 2px solid #555; border-radius: 8px; cursor: pointer;
          transition: transform 0.12s, border-color 0.12s;
        }
        .perk-card:hover { transform: translateY(-6px); border-color: #ffd060; }
        .perk-name { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #ffd060; }
        .perk-desc { font-size: 14px; line-height: 1.4; opacity: 0.85; }
      </style>
      <div class="perk-wrap">
        <div class="perk-title">Choose a Perk</div>
        <div class="perk-cards" id="perk-cards"></div>
      </div>
    `;
    parent.appendChild(this.root);
  }

  show(offers: readonly PerkDef[]): Promise<PerkId> {
    return new Promise((resolve) => {
      this.resolver = resolve;
      const cards = this.root.querySelector('#perk-cards') as HTMLDivElement;
      cards.innerHTML = '';
      for (const perk of offers) {
        const card = document.createElement('div');
        card.className = 'perk-card';
        card.innerHTML = `
          <div class="perk-name"></div>
          <div class="perk-desc"></div>
        `;
        (card.querySelector('.perk-name') as HTMLDivElement).textContent = perk.name;
        (card.querySelector('.perk-desc') as HTMLDivElement).textContent = perk.desc;
        card.addEventListener('click', () => this.pick(perk.id));
        cards.appendChild(card);
      }
      this.root.classList.add('active');
    });
  }

  private pick(id: PerkId): void {
    this.root.classList.remove('active');
    this.resolver?.(id);
    this.resolver = null;
  }

  destroy(): void {
    this.root.remove();
  }
}
