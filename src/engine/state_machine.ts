import { RepState, RepetitionEvent } from './types';

export interface StateMachineConfig {
  /**
   * Angle or metric value that defines the starting/lockout position.
   */
  startThreshold: number;

  /**
   * Threshold when moving into the working/inflection zone.
   */
  inflectionThreshold: number;

  /**
   * Threshold required to count as full valid range of motion (ROM).
   */
  peakRomThreshold: number;

  /**
   * Whether the primary metric decreases during the concentric/depth phase
   * (e.g., knee angle in a squat drops from 170 to 80 -> true)
   * or increases (e.g., hip height in a jump or arm raise -> false).
   */
  isDescendingPhase: boolean;

  /**
   * Minimum duration in milliseconds for a valid repetition (filters micro-twitches).
   */
  minRepDurationMs?: number;

  /**
   * Hysteresis buffer in degrees or units to eliminate flickering near threshold.
   */
  hysteresisBuffer?: number;
}

export class RepetitionStateMachine {
  private config: StateMachineConfig;
  private state: RepState = 'IDLE';
  private repCount: number = 0;
  private startTimeMs: number = 0;
  private peakTimeMs: number = 0;
  private peakMetric: number = 0;
  private repHistory: RepetitionEvent[] = [];
  private currentRepFaults: Set<string> = new Set();

  constructor(config: StateMachineConfig) {
    this.config = {
      minRepDurationMs: 400,
      hysteresisBuffer: 4,
      ...config,
    };
    this.peakMetric = config.startThreshold;
  }

  public getState(): RepState {
    return this.state;
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getRepHistory(): RepetitionEvent[] {
    return [...this.repHistory];
  }

  public getLastRepetition(): RepetitionEvent | null {
    return this.repHistory.length > 0 ? this.repHistory[this.repHistory.length - 1] : null;
  }

  public recordFault(fault: string): void {
    if (this.state !== 'IDLE') {
      this.currentRepFaults.add(fault);
    }
  }

  /**
   * Updates state based on the current metric and timestamp.
   * Returns newly completed repetition event if a rep just completed, or null.
   */
  public update(metric: number, timestampMs: number): RepetitionEvent | null {
    const { startThreshold, inflectionThreshold, peakRomThreshold, isDescendingPhase, minRepDurationMs, hysteresisBuffer = 4 } = this.config;

    if (isDescendingPhase) {
      // Metric DECREASES during work (e.g., Squat knee angle: 170 -> 80)
      switch (this.state) {
        case 'IDLE':
        case 'COMPLETED':
          if (metric >= startThreshold - hysteresisBuffer) {
            this.state = 'ARMED';
            this.peakMetric = metric;
          }
          break;

        case 'ARMED':
          if (metric <= inflectionThreshold) {
            this.state = 'CONCENTRIC';
            this.startTimeMs = timestampMs;
            this.peakMetric = metric;
            this.currentRepFaults.clear();
          }
          break;

        case 'CONCENTRIC':
          if (metric < this.peakMetric) {
            this.peakMetric = metric;
          }
          if (metric <= peakRomThreshold) {
            this.state = 'PEAK';
            this.peakTimeMs = timestampMs;
          } else if (metric >= startThreshold) {
            // Reverted before reaching inflection/peak, reset
            this.state = 'ARMED';
          }
          break;

        case 'PEAK':
          if (metric < this.peakMetric) {
            this.peakMetric = metric;
          }
          // Once starting to rise back up above peak threshold + hysteresis
          if (metric > peakRomThreshold + hysteresisBuffer) {
            this.state = 'ECCENTRIC';
          }
          break;

        case 'ECCENTRIC':
          if (metric >= startThreshold - hysteresisBuffer) {
            const duration = timestampMs - this.startTimeMs;
            if (duration >= (minRepDurationMs || 400)) {
              this.repCount++;
              this.state = 'COMPLETED';

              const concentricMs = Math.max(100, this.peakTimeMs - this.startTimeMs);
              const eccentricMs = Math.max(100, timestampMs - this.peakTimeMs);
              const romScore = this.calculateRomScore(this.peakMetric);

              const event: RepetitionEvent = {
                repNumber: this.repCount,
                startTimeMs: this.startTimeMs,
                peakTimeMs: this.peakTimeMs,
                endTimeMs: timestampMs,
                durationMs: duration,
                concentricMs,
                eccentricMs,
                peakRom: Math.round(this.peakMetric),
                romScore,
                faults: Array.from(this.currentRepFaults),
                passed: this.currentRepFaults.size === 0 && romScore >= 75,
                tempoString: `${(concentricMs / 1000).toFixed(1)}s / ${(eccentricMs / 1000).toFixed(1)}s`,
              };

              this.repHistory.push(event);
              this.currentRepFaults.clear();
              return event;
            } else {
              this.state = 'ARMED';
            }
          }
          break;
      }
    } else {
      // Metric INCREASES during work (e.g., Hip thrust angle, Arm raise angle: 10 -> 90)
      switch (this.state) {
        case 'IDLE':
        case 'COMPLETED':
          if (metric <= startThreshold + hysteresisBuffer) {
            this.state = 'ARMED';
            this.peakMetric = metric;
          }
          break;

        case 'ARMED':
          if (metric >= inflectionThreshold) {
            this.state = 'CONCENTRIC';
            this.startTimeMs = timestampMs;
            this.peakMetric = metric;
            this.currentRepFaults.clear();
          }
          break;

        case 'CONCENTRIC':
          if (metric > this.peakMetric) {
            this.peakMetric = metric;
          }
          if (metric >= peakRomThreshold) {
            this.state = 'PEAK';
            this.peakTimeMs = timestampMs;
          } else if (metric <= startThreshold) {
            this.state = 'ARMED';
          }
          break;

        case 'PEAK':
          if (metric > this.peakMetric) {
            this.peakMetric = metric;
          }
          if (metric < peakRomThreshold - hysteresisBuffer) {
            this.state = 'ECCENTRIC';
          }
          break;

        case 'ECCENTRIC':
          if (metric <= startThreshold + hysteresisBuffer) {
            const duration = timestampMs - this.startTimeMs;
            if (duration >= (minRepDurationMs || 400)) {
              this.repCount++;
              this.state = 'COMPLETED';

              const concentricMs = Math.max(100, this.peakTimeMs - this.startTimeMs);
              const eccentricMs = Math.max(100, timestampMs - this.peakTimeMs);
              const romScore = this.calculateRomScore(this.peakMetric);

              const event: RepetitionEvent = {
                repNumber: this.repCount,
                startTimeMs: this.startTimeMs,
                peakTimeMs: this.peakTimeMs,
                endTimeMs: timestampMs,
                durationMs: duration,
                concentricMs,
                eccentricMs,
                peakRom: Math.round(this.peakMetric),
                romScore,
                faults: Array.from(this.currentRepFaults),
                passed: this.currentRepFaults.size === 0 && romScore >= 75,
                tempoString: `${(concentricMs / 1000).toFixed(1)}s / ${(eccentricMs / 1000).toFixed(1)}s`,
              };

              this.repHistory.push(event);
              this.currentRepFaults.clear();
              return event;
            } else {
              this.state = 'ARMED';
            }
          }
          break;
      }
    }

    return null;
  }

  private calculateRomScore(achievedPeak: number): number {
    const { startThreshold, peakRomThreshold, isDescendingPhase } = this.config;
    const targetDelta = Math.abs(startThreshold - peakRomThreshold);
    const achievedDelta = Math.abs(startThreshold - achievedPeak);

    if (targetDelta <= 0) return 100;

    const ratio = achievedDelta / targetDelta;
    if (isDescendingPhase) {
      if (achievedPeak <= peakRomThreshold) {
        return Math.min(100, Math.round(100 + (peakRomThreshold - achievedPeak) * 0.5));
      }
      return Math.max(0, Math.min(100, Math.round(ratio * 100)));
    } else {
      if (achievedPeak >= peakRomThreshold) {
        return Math.min(100, Math.round(100 + (achievedPeak - peakRomThreshold) * 0.5));
      }
      return Math.max(0, Math.min(100, Math.round(ratio * 100)));
    }
  }

  public reset(): void {
    this.state = 'IDLE';
    this.repCount = 0;
    this.startTimeMs = 0;
    this.peakTimeMs = 0;
    this.peakMetric = this.config.startThreshold;
    this.repHistory = [];
    this.currentRepFaults.clear();
  }
}

/**
 * State machine for isometric holds (e.g., Plank, L-Sit, Handstand).
 * Only ticks active time while form is maintained within valid bounds.
 */
export class IsometricStateMachine {
  private activeTimeMs: number = 0;
  private lastTimestampMs: number = 0;
  private isHolding: boolean = false;
  private totalFaultsCount: number = 0;
  private maxDeltaMs: number;

  constructor(maxDeltaMs: number = 1100) {
    this.maxDeltaMs = maxDeltaMs;
  }

  public update(isValidForm: boolean, timestampMs: number): { activeSeconds: number; isHolding: boolean } {
    if (this.lastTimestampMs === 0) {
      this.lastTimestampMs = timestampMs;
    }

    const delta = Math.min(this.maxDeltaMs, Math.max(0, timestampMs - this.lastTimestampMs));
    this.lastTimestampMs = timestampMs;

    if (isValidForm) {
      this.isHolding = true;
      this.activeTimeMs += delta;
    } else {
      this.isHolding = false;
      this.totalFaultsCount++;
    }

    return {
      activeSeconds: Math.floor(this.activeTimeMs / 1000),
      isHolding: this.isHolding,
    };
  }

  public getActiveSeconds(): number {
    return Math.floor(this.activeTimeMs / 1000);
  }

  public getActiveMs(): number {
    return this.activeTimeMs;
  }

  public reset(): void {
    this.activeTimeMs = 0;
    this.lastTimestampMs = 0;
    this.isHolding = false;
    this.totalFaultsCount = 0;
  }
}
