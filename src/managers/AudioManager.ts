export type SfxId = 'fire_pistol' | 'fire_smg' | 'fire_shotgun' | 'hit' | 'pickup' | 'death';

interface SfxSpec {
  freq: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  sweep?: number;
}

const SFX: Record<SfxId, SfxSpec> = {
  fire_pistol: { freq: 320, duration: 0.08, type: 'square', gain: 0.18, sweep: -120 },
  fire_smg: { freq: 480, duration: 0.05, type: 'square', gain: 0.14, sweep: -150 },
  fire_shotgun: { freq: 180, duration: 0.18, type: 'sawtooth', gain: 0.22, sweep: -80 },
  hit: { freq: 880, duration: 0.05, type: 'triangle', gain: 0.18 },
  pickup: { freq: 660, duration: 0.18, type: 'sine', gain: 0.2, sweep: 440 },
  death: { freq: 110, duration: 0.4, type: 'sawtooth', gain: 0.25, sweep: -90 },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmOsc: OscillatorNode | null = null;

  bgmVolume = 0.4;
  sfxVolume = 0.7;

  ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmVolume;
      this.bgmGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setVolumes(bgm: number, sfx: number): void {
    this.bgmVolume = bgm;
    this.sfxVolume = sfx;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
    if (this.bgmGain) this.bgmGain.gain.value = bgm;
  }

  playSfx(id: SfxId): void {
    if (!this.ctx || !this.sfxGain) return;
    const spec = SFX[id];
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, now);
    if (spec.sweep !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, spec.freq + spec.sweep),
        now + spec.duration,
      );
    }
    g.gain.setValueAtTime(spec.gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + spec.duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + spec.duration);
  }

  startBgm(): void {
    if (!this.ctx || !this.bgmGain || this.bgmOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(this.bgmGain);
    osc.start();
    lfo.start();
    this.bgmOsc = osc;
  }

  stopBgm(): void {
    if (this.bgmOsc) {
      this.bgmOsc.stop();
      this.bgmOsc.disconnect();
      this.bgmOsc = null;
    }
  }
}
