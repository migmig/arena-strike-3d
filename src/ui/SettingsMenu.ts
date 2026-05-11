import {
  ALL_ACTIONS,
  describeBinding,
  type Action,
  type InputManager,
} from '@managers/InputManager';
import type {
  CrosshairStyle,
  Difficulty,
  OptionsState,
  SaveManager,
} from '@managers/SaveManager';

export interface SettingsMenuCallbacks {
  onClose: () => void;
  onOptionsChange: (patch: Partial<OptionsState>) => void;
  onOpenCredits: () => void;
}

const ACTION_LABELS: Record<Action, string> = {
  MOVE_FWD: 'Move forward',
  MOVE_BACK: 'Move back',
  STRAFE_L: 'Strafe left',
  STRAFE_R: 'Strafe right',
  JUMP: 'Jump',
  DASH: 'Dash',
  FIRE: 'Fire',
  ADS: 'Aim down sights',
  RELOAD: 'Reload',
  WEAPON_1: 'Weapon 1',
  WEAPON_2: 'Weapon 2',
  WEAPON_3: 'Weapon 3',
  WEAPON_PREV: 'Previous weapon',
  INTERACT: 'Interact',
  TOGGLE_CAMERA: 'Toggle camera',
  PAUSE: 'Pause',
};

const STYLES = `
#settings-menu {
  position: absolute; inset: 0; background: rgba(0,0,0,0.82);
  display: none; align-items: center; justify-content: center;
  z-index: 35; font-family: system-ui, sans-serif; color: #fff;
}
#settings-menu.active { display: flex; }
.settings-card {
  background: rgba(28,28,38,0.96); border: 1px solid #555; border-radius: 10px;
  width: 640px; max-height: 80vh; display: flex; flex-direction: column;
}
.settings-tabs { display: flex; border-bottom: 1px solid #444; }
.settings-tab {
  flex: 1; padding: 12px 0; text-align: center; cursor: pointer;
  background: transparent; border: none; color: #ccc; font-size: 14px;
}
.settings-tab.active { color: #ffd060; border-bottom: 2px solid #ffd060; }
.settings-body { padding: 18px 24px; overflow-y: auto; flex: 1; }
.settings-row {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; padding: 6px 0; font-size: 14px;
}
.settings-row label { opacity: 0.85; }
.settings-row input[type="range"] { flex: 1; max-width: 220px; }
.settings-row select, .settings-row input[type="checkbox"] {
  background: #2a2a35; color: #fff; border: 1px solid #555; border-radius: 4px;
  padding: 4px 8px; font-size: 13px;
}
.settings-footer {
  display: flex; justify-content: space-between; padding: 12px 24px;
  border-top: 1px solid #444; gap: 12px;
}
.settings-btn {
  padding: 8px 18px; background: #4a4a60; color: #fff; border: 1px solid #777;
  border-radius: 4px; cursor: pointer; font-size: 13px;
}
.settings-btn:hover { background: #5a5a75; border-color: #ffd060; }
.settings-btn.primary { background: #ffd060; color: #222; border-color: #ffd060; }
.settings-tabpanel { display: none; }
.settings-tabpanel.active { display: block; }
.keybind-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.keybind-action { opacity: 0.9; }
.keybind-key {
  background: #2a2a35; border: 1px solid #555; border-radius: 4px;
  padding: 3px 10px; font-family: monospace; cursor: pointer; min-width: 80px; text-align: center;
}
.keybind-key:hover { border-color: #ffd060; color: #ffd060; }
.keybind-key.listening { color: #ffd060; border-color: #ffd060; }
`;

export class SettingsMenu {
  private root: HTMLDivElement;
  private cb: SettingsMenuCallbacks;
  private body: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    private save: SaveManager,
    private input: InputManager,
    callbacks: SettingsMenuCallbacks,
  ) {
    this.cb = callbacks;
    this.root = document.createElement('div');
    this.root.id = 'settings-menu';
    this.root.innerHTML = `
      <style>${STYLES}</style>
      <div class="settings-card">
        <div class="settings-tabs">
          <button class="settings-tab active" data-tab="gameplay">Gameplay</button>
          <button class="settings-tab" data-tab="audio">Audio</button>
          <button class="settings-tab" data-tab="video">Video</button>
          <button class="settings-tab" data-tab="access">Access</button>
          <button class="settings-tab" data-tab="keys">Keys</button>
        </div>
        <div class="settings-body"></div>
        <div class="settings-footer">
          <button class="settings-btn" id="settings-credits">Credits</button>
          <div style="flex:1"></div>
          <button class="settings-btn" id="settings-reset-keys">Reset keys</button>
          <button class="settings-btn primary" id="settings-close">Close</button>
        </div>
      </div>
    `;
    parent.appendChild(this.root);
    this.body = this.root.querySelector('.settings-body') as HTMLDivElement;

    this.root.querySelectorAll<HTMLButtonElement>('.settings-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.selectTab(tab.dataset['tab'] ?? 'gameplay'));
    });
    (this.root.querySelector('#settings-close') as HTMLButtonElement).addEventListener('click', () => this.close());
    (this.root.querySelector('#settings-credits') as HTMLButtonElement).addEventListener('click', () => this.cb.onOpenCredits());
    (this.root.querySelector('#settings-reset-keys') as HTMLButtonElement).addEventListener('click', () => {
      this.input.resetKeymap();
      this.save.setKeymap(this.input.getKeymap());
      if (this.currentTab === 'keys') this.renderKeys();
    });
  }

  private currentTab: string = 'gameplay';

  open(): void {
    this.root.classList.add('active');
    this.selectTab(this.currentTab);
  }

  close(): void {
    this.root.classList.remove('active');
    this.cb.onClose();
  }

  isOpen(): boolean {
    return this.root.classList.contains('active');
  }

  private selectTab(tab: string): void {
    this.currentTab = tab;
    this.root.querySelectorAll<HTMLButtonElement>('.settings-tab').forEach((el) => {
      el.classList.toggle('active', el.dataset['tab'] === tab);
    });
    switch (tab) {
      case 'gameplay':
        this.renderGameplay();
        break;
      case 'audio':
        this.renderAudio();
        break;
      case 'video':
        this.renderVideo();
        break;
      case 'access':
        this.renderAccess();
        break;
      case 'keys':
        this.renderKeys();
        break;
    }
  }

  private opts(): OptionsState {
    return this.save.options;
  }

  private emit(patch: Partial<OptionsState>): void {
    this.save.setOptions(patch);
    this.cb.onOptionsChange(patch);
  }

  private renderGameplay(): void {
    const o = this.opts();
    this.body.innerHTML = `
      <div class="settings-row">
        <label>Sensitivity</label>
        <input type="range" min="0.0005" max="0.01" step="0.0005" value="${o.sensitivity}" id="opt-sens" />
        <span id="opt-sens-val">${o.sensitivity.toFixed(4)}</span>
      </div>
      <div class="settings-row">
        <label>Field of view</label>
        <input type="range" min="60" max="100" step="1" value="${o.fov}" id="opt-fov" />
        <span id="opt-fov-val">${o.fov}</span>
      </div>
      <div class="settings-row">
        <label>Invert Y</label>
        <input type="checkbox" id="opt-inv" ${o.invertY ? 'checked' : ''} />
      </div>
      <div class="settings-row">
        <label>Difficulty</label>
        <select id="opt-diff">
          ${(['easy', 'normal', 'hard', 'nightmare'] as Difficulty[])
            .map((d) => `<option value="${d}" ${o.difficulty === d ? 'selected' : ''}>${d}</option>`)
            .join('')}
        </select>
      </div>
    `;
    this.bindRange('opt-sens', 'opt-sens-val', 4, (v) => this.emit({ sensitivity: v }));
    this.bindRange('opt-fov', 'opt-fov-val', 0, (v) => this.emit({ fov: v }));
    (this.body.querySelector('#opt-inv') as HTMLInputElement).addEventListener('change', (e) => {
      this.emit({ invertY: (e.target as HTMLInputElement).checked });
    });
    (this.body.querySelector('#opt-diff') as HTMLSelectElement).addEventListener('change', (e) => {
      this.emit({ difficulty: (e.target as HTMLSelectElement).value as Difficulty });
    });
  }

  private renderAudio(): void {
    const o = this.opts();
    this.body.innerHTML = `
      <div class="settings-row">
        <label>Music volume</label>
        <input type="range" min="0" max="1" step="0.05" value="${o.bgmVolume}" id="opt-bgm" />
        <span id="opt-bgm-val">${Math.round(o.bgmVolume * 100)}%</span>
      </div>
      <div class="settings-row">
        <label>SFX volume</label>
        <input type="range" min="0" max="1" step="0.05" value="${o.sfxVolume}" id="opt-sfx" />
        <span id="opt-sfx-val">${Math.round(o.sfxVolume * 100)}%</span>
      </div>
    `;
    this.bindRange('opt-bgm', 'opt-bgm-val', 0, (v) => this.emit({ bgmVolume: v }), true);
    this.bindRange('opt-sfx', 'opt-sfx-val', 0, (v) => this.emit({ sfxVolume: v }), true);
  }

  private renderVideo(): void {
    const o = this.opts();
    this.body.innerHTML = `
      <div class="settings-row">
        <label>Graphics preset</label>
        <select id="opt-gfx">
          ${(['low', 'medium', 'high'] as const)
            .map((g) => `<option value="${g}" ${o.graphicsPreset === g ? 'selected' : ''}>${g}</option>`)
            .join('')}
        </select>
      </div>
      <div class="settings-row">
        <label>Crosshair style</label>
        <select id="opt-crosshair">
          ${(['dot', 'cross', 'circle', 'none'] as CrosshairStyle[])
            .map((c) => `<option value="${c}" ${o.crosshair === c ? 'selected' : ''}>${c}</option>`)
            .join('')}
        </select>
      </div>
    `;
    (this.body.querySelector('#opt-gfx') as HTMLSelectElement).addEventListener('change', (e) => {
      this.emit({ graphicsPreset: (e.target as HTMLSelectElement).value as OptionsState['graphicsPreset'] });
    });
    (this.body.querySelector('#opt-crosshair') as HTMLSelectElement).addEventListener('change', (e) => {
      this.emit({ crosshair: (e.target as HTMLSelectElement).value as CrosshairStyle });
    });
  }

  private renderAccess(): void {
    const o = this.opts();
    this.body.innerHTML = `
      <div class="settings-row">
        <label>Color-blind mode</label>
        <select id="opt-cb">
          ${(['off', 'protanopia', 'deuteranopia', 'tritanopia'] as const)
            .map((c) => `<option value="${c}" ${o.colorBlindMode === c ? 'selected' : ''}>${c}</option>`)
            .join('')}
        </select>
      </div>
      <div class="settings-row">
        <label>UI scale</label>
        <select id="opt-ui">
          ${([0.8, 1.0, 1.25, 1.5] as const)
            .map((s) => `<option value="${s}" ${o.uiScale === s ? 'selected' : ''}>${Math.round(s * 100)}%</option>`)
            .join('')}
        </select>
      </div>
      <div class="settings-row">
        <label>Reduce motion (no shake / pulse)</label>
        <input type="checkbox" id="opt-rm" ${o.reduceMotion ? 'checked' : ''} />
      </div>
    `;
    (this.body.querySelector('#opt-cb') as HTMLSelectElement).addEventListener('change', (e) => {
      this.emit({ colorBlindMode: (e.target as HTMLSelectElement).value as OptionsState['colorBlindMode'] });
    });
    (this.body.querySelector('#opt-ui') as HTMLSelectElement).addEventListener('change', (e) => {
      this.emit({ uiScale: Number((e.target as HTMLSelectElement).value) as OptionsState['uiScale'] });
    });
    (this.body.querySelector('#opt-rm') as HTMLInputElement).addEventListener('change', (e) => {
      this.emit({ reduceMotion: (e.target as HTMLInputElement).checked });
    });
  }

  private renderKeys(): void {
    const keymap = this.input.getKeymap();
    this.body.innerHTML = `
      <div style="font-size:12px;opacity:0.7;margin-bottom:8px">
        Click a binding to rebind. Press Esc to cancel.
      </div>
      ${ALL_ACTIONS.map((a) => {
        const b = keymap[a]?.[0];
        const label = b ? describeBinding(b) : '—';
        return `
          <div class="keybind-row">
            <span class="keybind-action">${ACTION_LABELS[a]}</span>
            <button class="keybind-key" data-action="${a}">${label}</button>
          </div>`;
      }).join('')}
    `;
    this.body.querySelectorAll<HTMLButtonElement>('.keybind-key').forEach((btn) => {
      btn.addEventListener('click', () => this.beginCapture(btn));
    });
  }

  private async beginCapture(btn: HTMLButtonElement): Promise<void> {
    const action = btn.dataset['action'] as Action;
    btn.classList.add('listening');
    btn.textContent = '...press key';
    const result = await this.input.captureNextBinding();
    btn.classList.remove('listening');
    if (result) {
      this.input.setBinding(action, result);
      this.save.setKeymap(this.input.getKeymap());
      btn.textContent = describeBinding(result);
    } else {
      const current = this.input.getKeymap()[action]?.[0];
      btn.textContent = current ? describeBinding(current) : '—';
    }
  }

  private bindRange(
    inputId: string,
    valueId: string,
    decimals: number,
    apply: (v: number) => void,
    asPercent = false,
  ): void {
    const inputEl = this.body.querySelector(`#${inputId}`) as HTMLInputElement;
    const valEl = this.body.querySelector(`#${valueId}`) as HTMLSpanElement;
    inputEl.addEventListener('input', () => {
      const v = Number(inputEl.value);
      valEl.textContent = asPercent ? `${Math.round(v * 100)}%` : v.toFixed(decimals);
      apply(v);
    });
  }

  destroy(): void {
    this.root.remove();
  }
}
