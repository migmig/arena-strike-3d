import type { OptionsState } from './SaveManager';

const PALETTES: Record<OptionsState['colorBlindMode'], Record<string, string>> = {
  off: {},
  protanopia: { '--enemy': '#ffcc00', '--pickup-health': '#00aaff', '--pickup-ammo': '#ffffff' },
  deuteranopia: { '--enemy': '#ff7000', '--pickup-health': '#00d0ff', '--pickup-ammo': '#ffffff' },
  tritanopia: { '--enemy': '#ff4060', '--pickup-health': '#ffff00', '--pickup-ammo': '#ffffff' },
};

export class Accessibility {
  apply(options: OptionsState): void {
    const root = document.documentElement;
    root.style.fontSize = `${16 * options.uiScale}px`;
    const palette = PALETTES[options.colorBlindMode];
    for (const [k, v] of Object.entries(palette)) {
      root.style.setProperty(k, v);
    }
    root.dataset['reduceMotion'] = options.reduceMotion ? '1' : '0';
  }
}
