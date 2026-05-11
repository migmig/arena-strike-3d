export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface ScoreEntry {
  score: number;
  wave: number;
  kills: number;
  date: number;
}

export interface OptionsState {
  sensitivity: number;
  fov: number;
  invertY: boolean;
  graphicsPreset: 'low' | 'medium' | 'high';
  bgmVolume: number;
  sfxVolume: number;
  uiScale: 0.8 | 1.0 | 1.25 | 1.5;
  colorBlindMode: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  reduceMotion: boolean;
  difficulty: Difficulty;
}

export interface SaveData {
  version: 1;
  options: OptionsState;
  highScores: Record<Difficulty, ScoreEntry[]>;
  stats: { totalKills: number; totalPlayTimeMs: number; sessions: number };
  flags: { tutorialSeen: boolean; telemetryConsent: boolean | null };
}

const STORAGE_KEY = 'arena-strike-save';
const TOP_N = 10;

export const DEFAULT_OPTIONS: OptionsState = {
  sensitivity: 0.0025,
  fov: 75,
  invertY: false,
  graphicsPreset: 'medium',
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  uiScale: 1.0,
  colorBlindMode: 'off',
  reduceMotion: false,
  difficulty: 'normal',
};

const DEFAULT_SAVE: SaveData = {
  version: 1,
  options: DEFAULT_OPTIONS,
  highScores: { easy: [], normal: [], hard: [], nightmare: [] },
  stats: { totalKills: 0, totalPlayTimeMs: 0, sessions: 0 },
  flags: { tutorialSeen: false, telemetryConsent: null },
};

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw) as Partial<SaveData> & { version?: number };
      return this.migrate(parsed);
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  private migrate(d: Partial<SaveData>): SaveData {
    return {
      version: 1,
      options: { ...DEFAULT_OPTIONS, ...(d.options ?? {}) },
      highScores: { ...DEFAULT_SAVE.highScores, ...(d.highScores ?? {}) },
      stats: { ...DEFAULT_SAVE.stats, ...(d.stats ?? {}) },
      flags: { ...DEFAULT_SAVE.flags, ...(d.flags ?? {}) },
    };
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('SaveManager: persist failed', e);
    }
  }

  get options(): OptionsState {
    return this.data.options;
  }

  setOptions(patch: Partial<OptionsState>): void {
    this.data.options = { ...this.data.options, ...patch };
    this.save();
  }

  recordScore(difficulty: Difficulty, entry: ScoreEntry): number {
    const list = this.data.highScores[difficulty];
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    if (list.length > TOP_N) list.length = TOP_N;
    this.save();
    return list.findIndex((e) => e === entry);
  }

  getHighScores(difficulty: Difficulty): readonly ScoreEntry[] {
    return this.data.highScores[difficulty];
  }

  bumpStats(kills: number, durationMs: number): void {
    this.data.stats.totalKills += kills;
    this.data.stats.totalPlayTimeMs += durationMs;
    this.data.stats.sessions += 1;
    this.save();
  }

  get tutorialSeen(): boolean {
    return this.data.flags.tutorialSeen;
  }

  markTutorialSeen(): void {
    this.data.flags.tutorialSeen = true;
    this.save();
  }

  get telemetryConsent(): boolean | null {
    return this.data.flags.telemetryConsent;
  }

  setTelemetryConsent(consent: boolean): void {
    this.data.flags.telemetryConsent = consent;
    this.save();
  }
}
