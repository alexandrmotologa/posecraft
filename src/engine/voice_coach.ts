export class VoiceCoach {
  private isEnabled: boolean = true;
  private lastSpokenMs: number = 0;
  private minIntervalMs: number = 2400; // minimum gap between voice cues to avoid spam
  private lastAlertId: string | null = null;

  private cueMap: Record<string, string> = {
    // Biomechanical faults
    knee_valgus: 'Knees out',
    valgus_bulgarian: 'Push knee out',
    lumbar_rounding: 'Straighten your back',
    hyperextension: 'Do not arch back',
    hip_sag: 'Squeeze your core',
    hip_pike: 'Lower your hips',
    kipping_detected: 'Stop swinging legs',
    shallow_chin: 'Chin over the bar',
    shoulder_dump: 'Chest proud, protect shoulders',
    bent_knees: 'Lock knees straight',
    low_hips: 'Lift feet higher',
    banana_back: 'Tuck your pelvis',
    closed_shoulders: 'Open your shoulders',
    elbow_flare: 'Tuck elbows to ribs',
    asymmetric_press: 'Press evenly with both arms',
    lumbar_arch: 'Keep torso vertical',
    torso_momentum: 'Do not stand up, maintain hinge',
    elbow_drift: 'Pin elbows to your sides',
    torso_swing: 'Stop swinging your torso',
    trap_shrug: 'Drop shoulders, relax traps',
    torso_lean: 'Keep chest upright',
    pelvic_twist: 'Square your hips to floor',
    knee_bounce: 'Do not bounce knees',
    squatty_swing: 'Hinge back, do not squat',
    chest_touch: 'Chest all the way to floor',
    asymmetric_landing: 'Land evenly on both feet',
    dropped_guard: 'Hands up, guard your jaw',
    stiff_landing: 'Bend knees to absorb landing',
    overstriding: 'Land feet under hips',
    steep_takeoff: 'Jump forward at 45 degrees',
    thoracic_drop: 'Keep arms overhead',
    ankle_restriction: 'Keep heels flat',
    shoulder_tightness: 'Reach fingers closer',
    tech_neck_slouch: 'Lift your chin, sit tall',
    mild_slouch: 'Head up',
  };

  public get cues(): Record<string, string> {
    return this.cueMap;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public speakAlert(alertId: string, force: boolean = false): void {
    if (!this.isEnabled) return;
    const now = Date.now();

    // Prevent repeating the same alert within 4 seconds
    if (this.lastAlertId === alertId && now - this.lastSpokenMs < 4000 && !force) {
      return;
    }

    if (now - this.lastSpokenMs < this.minIntervalMs && !force) {
      return;
    }

    const phrase = this.cueMap[alertId];
    if (!phrase) return;

    this.speak(phrase);
    this.lastSpokenMs = now;
    this.lastAlertId = alertId;
  }

  public speakRep(repNumber: number): void {
    if (!this.isEnabled) return;
    const now = Date.now();
    // Only speak rep count if there was no recent voice alert
    if (now - this.lastSpokenMs >= 1500) {
      this.speak(`${repNumber}`);
      this.lastSpokenMs = now;
      this.lastAlertId = `rep_${repNumber}`;
    }
  }

  public speak(text: string): void {
    if (!this.isEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // cancel pending speech so cues stay instant
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15; // slightly brisk coaching tempo
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {
      // SpeechSynthesis may be blocked if no user gesture has occurred yet
    }
  }
}

export const voiceCoach = new VoiceCoach();
