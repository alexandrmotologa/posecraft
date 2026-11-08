/**
 * Continuous Auditory Biofeedback & Sonification Engine for PoseCraft.
 * Uses native Web Audio API FM/dual-oscillator synthesis to map instantaneous
 * repetition velocity to acoustic pitch and generates acoustic dissonance on postural faults.
 */

export class BiofeedbackSonificationEngine {
  private ctx: AudioContext | null = null;
  private primaryOsc: OscillatorNode | null = null;
  private primaryGain: GainNode | null = null;
  private faultOsc: OscillatorNode | null = null;
  private faultGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isEnabled: boolean = false;
  private isRunning: boolean = false;
  private currentBaseFreq: number = 220; // A3

  constructor() {
    // Lazily initialized on first user interaction to comply with browser audio autoplay policy
  }

  private initAudio() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.18, this.ctx.currentTime); // gentle ambient volume
      this.masterGain.connect(this.ctx.destination);

      // 1. Primary Velocity Oscillator (warm triangle wave)
      this.primaryOsc = this.ctx.createOscillator();
      this.primaryOsc.type = 'triangle';
      this.primaryOsc.frequency.setValueAtTime(220, this.ctx.currentTime);

      this.primaryGain = this.ctx.createGain();
      this.primaryGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.primaryOsc.connect(this.primaryGain);
      this.primaryGain.connect(this.masterGain);
      this.primaryOsc.start();

      // 2. Fault Warning Dissonance Oscillator (sawtooth wave detuned to tritone)
      this.faultOsc = this.ctx.createOscillator();
      this.faultOsc.type = 'sawtooth';
      this.faultOsc.frequency.setValueAtTime(220 * 1.414, this.ctx.currentTime); // Tritone interval

      this.faultGain = this.ctx.createGain();
      this.faultGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.faultOsc.connect(this.faultGain);
      this.faultGain.connect(this.masterGain);
      this.faultOsc.start();

      this.isRunning = true;
    } catch {
      // AudioContext unavailable
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.initAudio();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } else {
      this.silence();
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  /**
   * Modulates carrier pitch continuously based on concentric propulsion velocity.
   */
  public updateKinematics(
    concentricVelocityMps: number,
    isConcentric: boolean,
    hasSafetyAlert: boolean
  ) {
    if (!this.isEnabled || !this.ctx || !this.isRunning || !this.primaryGain || !this.primaryOsc) {
      return;
    }

    const now = this.ctx.currentTime;

    if (isConcentric && concentricVelocityMps > 0.05) {
      // Scale frequency from 220Hz (A3) at 0.1 m/s up to 660Hz (E5) at 1.2 m/s
      const clampedVel = Math.min(1.2, Math.max(0.1, concentricVelocityMps));
      const targetFreq = 220 + ((clampedVel - 0.1) / 1.1) * 440;
      this.currentBaseFreq = targetFreq;

      this.primaryOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
      // Smooth attack
      this.primaryGain.gain.setTargetAtTime(0.25, now, 0.03);
    } else {
      // Gentle release when not moving or during eccentric descent
      this.primaryGain.gain.setTargetAtTime(0.001, now, 0.08);
    }

    // Postural fault dissonance handling
    if (hasSafetyAlert && this.faultGain && this.faultOsc) {
      // Dissonant beating tritone
      this.faultOsc.frequency.setTargetAtTime(this.currentBaseFreq * 1.414, now, 0.02);
      this.faultGain.gain.setTargetAtTime(0.20, now, 0.02);
    } else if (this.faultGain) {
      this.faultGain.gain.setTargetAtTime(0.0001, now, 0.05);
    }
  }

  public silence() {
    if (this.ctx && this.primaryGain && this.faultGain) {
      const now = this.ctx.currentTime;
      this.primaryGain.gain.setTargetAtTime(0.0001, now, 0.02);
      this.faultGain.gain.setTargetAtTime(0.0001, now, 0.02);
    }
  }
}

export const sonificationEngine = new BiofeedbackSonificationEngine();
