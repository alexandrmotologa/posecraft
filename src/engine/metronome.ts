export type TempoPhase = 'eccentric' | 'pause_bottom' | 'concentric' | 'pause_top';

export interface TempoConfig {
  eccentricSeconds: number; // e.g. 3
  pauseBottomSeconds: number; // e.g. 1
  concentricSeconds: number; // e.g. 1
  pauseTopSeconds: number; // e.g. 0
}

export class TempoMetronome {
  private isRunning: boolean = false;
  private config: TempoConfig = {
    eccentricSeconds: 3,
    pauseBottomSeconds: 1,
    concentricSeconds: 1,
    pauseTopSeconds: 0,
  };
  private currentPhase: TempoPhase = 'eccentric';
  private phaseSecondsLeft: number = 3;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;
  private onTickCallback?: (phase: TempoPhase, secondsLeft: number) => void;

  constructor(initialConfig?: Partial<TempoConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
      this.phaseSecondsLeft = this.config.eccentricSeconds;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setConfig(config: TempoConfig): void {
    this.config = config;
    this.reset();
  }

  public getConfig(): TempoConfig {
    return { ...this.config };
  }

  public getPhase(): TempoPhase {
    return this.currentPhase;
  }

  public getSecondsLeft(): number {
    return this.phaseSecondsLeft;
  }

  public setOnTick(callback: (phase: TempoPhase, secondsLeft: number) => void): void {
    this.onTickCallback = callback;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentPhase = 'eccentric';
    this.phaseSecondsLeft = this.config.eccentricSeconds;

    this.playTone(440, 0.05); // Initial tick
    if (this.onTickCallback) {
      this.onTickCallback(this.currentPhase, this.phaseSecondsLeft);
    }

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public reset(): void {
    this.stop();
    this.currentPhase = 'eccentric';
    this.phaseSecondsLeft = this.config.eccentricSeconds;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  private tick(): void {
    this.phaseSecondsLeft--;

    if (this.phaseSecondsLeft <= 0) {
      // Transition to next tempo phase
      switch (this.currentPhase) {
        case 'eccentric':
          if (this.config.pauseBottomSeconds > 0) {
            this.currentPhase = 'pause_bottom';
            this.phaseSecondsLeft = this.config.pauseBottomSeconds;
            this.playTone(330, 0.1);
          } else {
            this.currentPhase = 'concentric';
            this.phaseSecondsLeft = this.config.concentricSeconds;
            this.playTone(880, 0.15); // explosive concentric chime
          }
          break;

        case 'pause_bottom':
          this.currentPhase = 'concentric';
          this.phaseSecondsLeft = this.config.concentricSeconds;
          this.playTone(880, 0.15);
          break;

        case 'concentric':
          if (this.config.pauseTopSeconds > 0) {
            this.currentPhase = 'pause_top';
            this.phaseSecondsLeft = this.config.pauseTopSeconds;
            this.playTone(550, 0.08);
          } else {
            this.currentPhase = 'eccentric';
            this.phaseSecondsLeft = this.config.eccentricSeconds;
            this.playTone(440, 0.08);
          }
          break;

        case 'pause_top':
          this.currentPhase = 'eccentric';
          this.phaseSecondsLeft = this.config.eccentricSeconds;
          this.playTone(440, 0.08);
          break;
      }
    } else {
      // Ordinary tick within phase
      this.playTone(this.currentPhase === 'concentric' ? 660 : 440, 0.05);
    }

    if (this.onTickCallback) {
      this.onTickCallback(this.currentPhase, this.phaseSecondsLeft);
    }
  }

  private playTone(freq: number, duration: number): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignored
    }
  }
}

export const tempoMetronome = new TempoMetronome();
