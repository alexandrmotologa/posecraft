/**
 * Velocity-Based Training (VBT) & Power Kinematics Engine for PoseCraft.
 * Computes Mean Concentric Velocity (MCV), Peak Velocity, Velocity Loss %, and VBT Training Zones.
 */
import { RepetitionEvent } from './types';

export type VbtTrainingZone =
  | 'absolute_strength' // < 0.50 m/s (>85% 1RM)
  | 'strength_speed'    // 0.50 - 0.75 m/s (70-85% 1RM)
  | 'speed_strength'    // 0.75 - 1.00 m/s (50-70% 1RM)
  | 'hyper_speed';      // > 1.00 m/s (<50% 1RM)

export interface VbtRepetitionData {
  repNumber: number;
  meanConcentricVelocity: number; // m/s
  peakVelocity: number; // m/s
  powerOutputWatts: number; // estimated W/kg normalized
  velocityLossPercent: number; // % drop from fastest rep in set
  zone: VbtTrainingZone;
  fatigueWarning: boolean;
}

export class VbtEngine {
  private fastestVelocity: number = 0;
  private repDataList: VbtRepetitionData[] = [];
  private velocityLossLimit: number = 20; // default 20% limit for strength hypertrophy

  public setVelocityLossLimit(limitPercent: number) {
    this.velocityLossLimit = limitPercent;
  }

  public reset() {
    this.fastestVelocity = 0;
    this.repDataList = [];
  }

  /**
   * Evaluates a completed repetition using concentric duration and user vertical displacement.
   * Standard vertical displacement estimate for barbell/calisthenics is ~0.55m to 0.75m.
   */
  public evaluateRepetition(
    rep: RepetitionEvent,
    userHeightMeters: number = 1.78,
    estimatedDisplacementMeters?: number
  ): VbtRepetitionData {
    // If displacement not supplied, estimate from ROM and user height
    // e.g. a deep squat or pull-up travels ~38-42% of total height
    const displacement = estimatedDisplacementMeters || (userHeightMeters * 0.38);

    const concentricSeconds = Math.max(0.2, rep.concentricMs / 1000);
    const meanVelocity = parseFloat((displacement / concentricSeconds).toFixed(2));
    const peakVelocity = parseFloat((meanVelocity * 1.45).toFixed(2)); // kinematic sinusoidal peak multiplier

    // Estimated power output: P = Force * Velocity ~ (mass * g) * v
    // Normalized to watts/kg: ~ 9.81 * velocity * 1.6
    const powerOutput = Math.round(9.81 * meanVelocity * 1.6 * 10);

    // Track fastest rep in set
    if (this.fastestVelocity === 0 || meanVelocity > this.fastestVelocity) {
      this.fastestVelocity = meanVelocity;
    }

    const velocityLoss = this.fastestVelocity > 0
      ? Math.max(0, parseFloat((((this.fastestVelocity - meanVelocity) / this.fastestVelocity) * 100).toFixed(1)))
      : 0;

    const zone: VbtTrainingZone =
      meanVelocity < 0.50
        ? 'absolute_strength'
        : meanVelocity < 0.75
        ? 'strength_speed'
        : meanVelocity < 1.00
        ? 'speed_strength'
        : 'hyper_speed';

    const fatigueWarning = velocityLoss >= this.velocityLossLimit;

    const vbtData: VbtRepetitionData = {
      repNumber: rep.repNumber,
      meanConcentricVelocity: meanVelocity,
      peakVelocity,
      powerOutputWatts: powerOutput,
      velocityLossPercent: velocityLoss,
      zone,
      fatigueWarning,
    };

    this.repDataList.push(vbtData);
    return vbtData;
  }

  public getHistory(): VbtRepetitionData[] {
    return [...this.repDataList];
  }

  public getAverageVelocity(): number {
    if (this.repDataList.length === 0) return 0;
    const sum = this.repDataList.reduce((acc, r) => acc + r.meanConcentricVelocity, 0);
    return parseFloat((sum / this.repDataList.length).toFixed(2));
  }

  public getMaxVelocityLoss(): number {
    if (this.repDataList.length === 0) return 0;
    return Math.max(...this.repDataList.map(r => r.velocityLossPercent));
  }

  public getZoneLabel(zone: VbtTrainingZone): string {
    switch (zone) {
      case 'absolute_strength':
        return 'Absolute Strength (>85% 1RM)';
      case 'strength_speed':
        return 'Strength-Speed (70-85% 1RM)';
      case 'speed_strength':
        return 'Speed-Strength (50-70% 1RM)';
      case 'hyper_speed':
        return 'Speed & Power (<50% 1RM)';
    }
  }
}

export const vbtEngine = new VbtEngine();
