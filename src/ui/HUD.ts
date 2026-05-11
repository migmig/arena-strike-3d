import type { PlayerStats } from '@systems/Health';
import type { ScoreSystem } from '@systems/ScoreSystem';
import type { WeaponSystem } from '@systems/WeaponSystem';
import type { WaveSystem } from '@systems/WaveSystem';
import type { CrosshairStyle } from '@managers/SaveManager';

export class HUD {
  private root: HTMLDivElement;
  private hpFill: HTMLDivElement;
  private hpText: HTMLSpanElement;
  private ammoText: HTMLSpanElement;
  private weaponText: HTMLSpanElement;
  private waveText: HTMLSpanElement;
  private comboText: HTMLSpanElement;
  private scoreText: HTMLSpanElement;
  private crosshair: HTMLDivElement;
  private hitMarker: HTMLDivElement;
  private hitMarkerTimer = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud-root';
    this.root.innerHTML = `
      <style>
        #hud-root { position: absolute; inset: 0; pointer-events: none; font-family: system-ui, sans-serif; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
        .hp-wrap { position: absolute; left: 24px; bottom: 24px; width: 240px; }
        .hp-bar { width: 100%; height: 18px; background: rgba(20,20,30,0.7); border: 1px solid #555; border-radius: 4px; overflow: hidden; }
        .hp-fill { height: 100%; background: linear-gradient(90deg, #6ee06e, #2da02d); transition: width 0.15s; }
        .hp-text { font-size: 14px; margin-top: 4px; }
        .ammo { position: absolute; right: 32px; bottom: 24px; text-align: right; }
        .ammo-num { font-size: 36px; font-weight: 700; }
        .ammo-weapon { font-size: 14px; opacity: 0.8; }
        .wave-info { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); text-align: center; }
        .wave-num { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
        .combo { font-size: 14px; color: #ffd060; min-height: 18px; }
        .score { position: absolute; top: 16px; right: 24px; font-size: 18px; }
        .crosshair {
          position: absolute; left: 50%; top: 50%;
          pointer-events: none; opacity: 0.85;
          transform: translate(-50%, -50%);
        }
        .crosshair[data-style="dot"] {
          width: 6px; height: 6px; background: #fff; border-radius: 50%;
        }
        .crosshair[data-style="cross"] {
          width: 18px; height: 18px; background:
            linear-gradient(#fff, #fff) center/2px 100% no-repeat,
            linear-gradient(#fff, #fff) center/100% 2px no-repeat;
        }
        .crosshair[data-style="circle"] {
          width: 14px; height: 14px; border: 1.5px solid #fff; border-radius: 50%; background: transparent;
        }
        .crosshair[data-style="none"] { display: none; }
        .hit-marker {
          position: absolute; left: 50%; top: 50%; width: 20px; height: 20px;
          margin-left: -10px; margin-top: -10px; opacity: 0; transition: opacity 0.08s;
        }
        .hit-marker::before, .hit-marker::after {
          content: ''; position: absolute; background: #fff; left: 50%; top: 50%; transform-origin: 0 0;
        }
        .hit-marker::before { width: 10px; height: 2px; transform: translate(-50%, -50%) rotate(45deg); }
        .hit-marker::after { width: 10px; height: 2px; transform: translate(-50%, -50%) rotate(-45deg); }
        .hit-marker.active { opacity: 1; }
        .hit-marker.crit::before, .hit-marker.crit::after { background: #ffd060; }
      </style>
      <div class="hp-wrap">
        <div class="hp-bar"><div class="hp-fill" id="hp-fill"></div></div>
        <div class="hp-text" id="hp-text">100 / 100</div>
      </div>
      <div class="ammo">
        <div class="ammo-num" id="ammo-text">12 / ∞</div>
        <div class="ammo-weapon" id="weapon-text">Pistol</div>
      </div>
      <div class="wave-info">
        <div class="wave-num" id="wave-text">Wave 1</div>
        <div class="combo" id="combo-text"></div>
      </div>
      <div class="score" id="score-text">0</div>
      <div class="crosshair" data-style="dot"></div>
      <div class="hit-marker" id="hit-marker"></div>
    `;
    parent.appendChild(this.root);

    this.hpFill = this.root.querySelector('#hp-fill') as HTMLDivElement;
    this.hpText = this.root.querySelector('#hp-text') as HTMLSpanElement;
    this.ammoText = this.root.querySelector('#ammo-text') as HTMLSpanElement;
    this.weaponText = this.root.querySelector('#weapon-text') as HTMLSpanElement;
    this.waveText = this.root.querySelector('#wave-text') as HTMLSpanElement;
    this.comboText = this.root.querySelector('#combo-text') as HTMLSpanElement;
    this.scoreText = this.root.querySelector('#score-text') as HTMLSpanElement;
    this.crosshair = this.root.querySelector('.crosshair') as HTMLDivElement;
    this.hitMarker = this.root.querySelector('#hit-marker') as HTMLDivElement;
  }

  setCrosshairStyle(style: CrosshairStyle): void {
    this.crosshair.dataset['style'] = style;
  }

  showHitMarker(isCrit: boolean): void {
    this.hitMarker.classList.toggle('crit', isCrit);
    this.hitMarker.classList.add('active');
    this.hitMarkerTimer = 100;
  }

  update(
    deltaTimeMs: number,
    stats: PlayerStats,
    weapons: WeaponSystem,
    score: ScoreSystem,
    waves: WaveSystem,
  ): void {
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= deltaTimeMs;
      if (this.hitMarkerTimer <= 0) this.hitMarker.classList.remove('active');
    }

    const hpRatio = Math.max(0, stats.currentHealth / stats.maxHealth);
    this.hpFill.style.width = `${hpRatio * 100}%`;
    this.hpText.textContent = `${Math.ceil(stats.currentHealth)} / ${stats.maxHealth}`;

    const w = weapons.active;
    const reserve = w.spec.unlimitedReserve ? '∞' : String(w.reserve);
    this.ammoText.textContent = `${w.ammoInMag} / ${reserve}`;
    this.weaponText.textContent = w.spec.name + (w.reloadingUntil > 0 ? ' · reloading' : '');

    this.waveText.textContent = `Wave ${waves.currentWave} / ${waves.totalWaves}`;
    this.comboText.textContent =
      score.combo >= 3 ? `${score.combo}× combo (${score.getMultiplier().toFixed(1)}×)` : '';
    this.scoreText.textContent = score.score.toLocaleString();
  }

  destroy(): void {
    this.root.remove();
  }
}
