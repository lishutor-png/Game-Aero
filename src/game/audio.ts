class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private windOsc: OscillatorNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicPlaying = false;
  private intensity = 0.2; // 0..1 rises with speed & turbo
  private turboActive = false;

  private musicVolume = 0.45;
  private sfxVolume = 0.7;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setVolumes(musicVol: number, sfxVol: number, muted: boolean): void {
    this.musicVolume = Math.max(0, Math.min(1, musicVol));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVol));
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.32, now, 0.06);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.55, now, 0.04);
  }

  public setFlightDynamics(intensity: number, turboActive: boolean, steerAmount: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
    this.turboActive = turboActive;

    if (this.windFilter && this.windGain && this.ctx) {
      const now = this.ctx.currentTime;
      const freq = 220 + this.intensity * 420 + (turboActive ? 280 : 0) + Math.abs(steerAmount) * 140;
      const gainVal = 0.015 + this.intensity * 0.035 + (turboActive ? 0.03 : 0);
      this.windFilter.frequency.setTargetAtTime(freq, now, 0.08);
      this.windGain.gain.setTargetAtTime(gainVal, now, 0.08);
    }
  }

  public startDynamicMusic(mode: 'menu' | 'flight'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (mode === 'flight' && !this.windOsc && this.sfxGain) {
      // Gentle filtered airflow hum
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 85;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 260;
      filter.Q.value = 1.4;
      const gain = ctx.createGain();
      gain.gain.value = 0.018;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      this.windOsc = osc;
      this.windFilter = filter;
      this.windGain = gain;
    }

    if (mode === 'menu' && this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.15);
    }

    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.scheduleNextBeat();
  }

  public stopWind(): void {
    if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
    }
  }

  private scheduleNextBeat(): void {
    if (!this.musicPlaying) return;
    const stepMs = this.turboActive
      ? 230
      : Math.round(420 - this.intensity * 150);

    this.playMusicStep();
    this.musicTimer = window.setTimeout(() => {
      this.scheduleNextBeat();
    }, stepMs);
  }

  private playMusicStep(): void {
    if (!this.ctx || !this.musicGain || this.muted || this.musicVolume <= 0.01) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    // Calm pentatonic / Lydian uplifting chord progression (C - G - Am - F feel)
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [196.0, 246.94, 293.66, 392.0], // G6
      [220.0, 261.63, 329.63, 440.0], // Am7
      [174.61, 220.0, 261.63, 349.23], // Fmaj7
    ];
    const chordIdx = Math.floor(this.musicStep / 4) % chords.length;
    const chord = chords[chordIdx];
    const arpIdx = this.musicStep % 4;

    // Pad on chord change
    if (arpIdx === 0) {
      const padOsc = this.ctx.createOscillator();
      const padGain = this.ctx.createGain();
      padOsc.type = 'sine';
      padOsc.frequency.setValueAtTime(chord[0] * 0.5, now);
      padGain.gain.setValueAtTime(0.001, now);
      padGain.gain.linearRampToValueAtTime(0.22, now + 0.18);
      padGain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
      padOsc.connect(padGain);
      padGain.connect(this.musicGain);
      padOsc.start(now);
      padOsc.stop(now + 1.5);
    }

    // Melodic arpeggio note
    const noteOsc = this.ctx.createOscillator();
    const noteFilter = this.ctx.createBiquadFilter();
    const noteGain = this.ctx.createGain();

    noteOsc.type = this.turboActive ? 'triangle' : 'sine';
    const octaveBoost = this.turboActive && arpIdx % 2 === 1 ? 2 : 1;
    noteOsc.frequency.setValueAtTime(chord[arpIdx] * octaveBoost, now);

    noteFilter.type = 'lowpass';
    noteFilter.frequency.setValueAtTime(750 + this.intensity * 1600, now);

    const amp = 0.08 + this.intensity * 0.08;
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(amp, now + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    noteOsc.connect(noteFilter);
    noteFilter.connect(noteGain);
    noteGain.connect(this.musicGain);
    noteOsc.start(now);
    noteOsc.stop(now + 0.36);

    this.musicStep = (this.musicStep + 1) % 64;
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playGatePass(combo: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const baseFreq = 440 * Math.pow(1.05946, Math.min(combo, 12));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.09);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playPowerUp(kind: 'turbo' | 'shield' | 'bonus'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const notes =
      kind === 'turbo'
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === 'shield'
          ? [392.0, 493.88, 587.33, 783.99]
          : [587.33, 880.0];

    notes.forEach((freq, idx) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.045;
      osc.type = kind === 'turbo' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.13, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playShieldDeflect(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.25);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playCrash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.35);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public dispose(): void {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.windOsc) {
      try {
        this.windOsc.stop();
      } catch {
        // ignore
      }
      this.windOsc = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const soundEngine = new ProceduralAudioEngine();
