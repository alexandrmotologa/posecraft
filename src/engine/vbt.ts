/**
 * Velocity-Based Training (VBT) & Power Kinematics Engine for PoseCraft.
 * Computes Mean Concentric Velocity (MCV), Peak Velocity, Velocity Loss %,
 * Minimal Velocity Thresholds (MVT), Reps-in-Reserve (RIR), RPE, and dynamic 1RM.
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
  estimatedRpe: number; // 6.5 to 10.0
  repsInReserve: number; // 0 to 4+
  estimated1RmKg?: number; // predicted 1RM if load supplied
}

export const MINIMAL_VELOCITY_THRESHOLDS: Record<string, number> = {
  back_squat: 0.30,
  bulgarian_squat: 0.28,
  bench_press: 0.18,
  deadlift: 0.15,
  overhead_press: 0.20,
  barbell_row: 0.35,
  pull_ups: 0.22,
  dips: 0.20,
};

export class VbtEngine {
  private fastestVelocity: number = 0;
  private repDataList: VbtRepetitionData[] = [];
  private velocityLossLimit: number = 20; // default 20% limit for strength hypertrophy
  private currentLoadKg: number = 0; // barbell or added load in kg

  public setVelocityLossLimit(limitPercent: number) {
    this.velocityLossLimit = limitPercent;
  }

  public setCurrentLoad(loadKg: number) {
    this.currentLoadKg = Math.max(0, loadKg);
  }

  public getCurrentLoad(): number {
    return this.currentLoadKg;
  }

  public reset() {
    this.fastestVelocity = 0;
    this.repDataList = [];
  }

  /**
   * Calculates Reps in Reserve (RIR) and RPE based on velocity loss % and velocity proximity to MVT.
   * Grounded in González-Badillo & Sánchez-Medina (2010).
   */
  public calculateRpe(
    velocityLossPercent: number,
    meanVelocity: number,
    exerciseId: string = 'back_squat'
  ): { rpe: number; rir: number; description: string } {
    const mvt = MINIMAL_VELOCITY_THRESHOLDS[exerciseId] || 0.25;

    if (meanVelocity <= mvt + 0.04 || velocityLossPercent >= 35) {
      return { rpe: 10.0, rir: 0, description: 'Maximum effort / 0 Reps in Reserve' };
    } else if (velocityLossPercent >= 28 || meanVelocity <= mvt + 0.08) {
      return { rpe: 9.5, rir: 0.5, description: 'Near maximal / maybe 1 grind rep left' };
    } else if (velocityLossPercent >= 20 || meanVelocity <= mvt + 0.15) {
      return { rpe: 9.0, rir: 1, description: 'High exertion / 1 solid rep in reserve' };
    } else if (velocityLossPercent >= 15) {
      return { rpe: 8.5, rir: 1.5, description: 'Moderate-high exertion / 1 to 2 reps in reserve' };
    } else if (velocityLossPercent >= 10) {
      return { rpe: 8.0, rir: 2, description: 'Target hypertrophy sweet spot / 2 reps in reserve' };
    } else if (velocityLossPercent >= 5) {
      return { rpe: 7.5, rir: 3, description: 'Moderate exertion / 3 reps in reserve' };
    } else {
      return { rpe: 7.0, rir: 4, description: 'Submaximal / 4+ reps in reserve' };
    }
  }

  /**
   * Predicts 1RM using linear force-velocity regression: 1RM = Load / (1 - (v - MVT) * slope)
   */
  public calculateEstimated1Rm(
    loadKg: number,
    meanVelocity: number,
    exerciseId: string = 'back_squat'
  ): number {
    if (loadKg <= 0) return 0;
    const mvt = MINIMAL_VELOCITY_THRESHOLDS[exerciseId] || 0.25;
    // Standard generalized slope coefficient ~ 0.28
    const slope = 0.28;
    const velocityDiff = Math.max(0, meanVelocity - mvt);
    const estimatedPercent1Rm = Math.max(0.40, Math.min(1.0, 1.0 - velocityDiff * slope));
    return Math.round(loadKg / estimatedPercent1Rm);
  }

  /**
   * Evaluates a completed repetition using concentric duration and user vertical displacement.
   */
  public evaluateRepetition(
    rep: RepetitionEvent,
    userHeightMeters: number = 1.78,
    estimatedDisplacementMeters?: number,
    exerciseId: string = 'back_squat'
  ): VbtRepetitionData {
    const displacement = estimatedDisplacementMeters || (userHeightMeters * 0.38);
    const concentricSeconds = Math.max(0.2, rep.concentricMs / 1000);
    const meanVelocity = parseFloat((displacement / concentricSeconds).toFixed(2));
    const peakVelocity = parseFloat((meanVelocity * 1.45).toFixed(2)); // kinematic sinusoidal peak multiplier

    // Estimated power output: P = Force * Velocity ~ (mass * g) * v
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

    // RPE and RIR calculation
    const { rpe, rir } = this.calculateRpe(velocityLoss, meanVelocity, exerciseId);

    // Estimated 1RM if load supplied
    const estimated1RmKg = this.currentLoadKg > 0
      ? this.calculateEstimated1Rm(this.currentLoadKg, meanVelocity, exerciseId)
      : undefined;

    const vbtData: VbtRepetitionData = {
      repNumber: rep.repNumber,
      meanConcentricVelocity: meanVelocity,
      peakVelocity,
      powerOutputWatts: powerOutput,
      velocityLossPercent: velocityLoss,
      zone,
      fatigueWarning,
      estimatedRpe: rpe,
      repsInReserve: rir,
      estimated1RmKg,
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
    return Math.max(...this.repDataList.map((r) => r.velocityLossPercent));
  }

  public getLatestRpe(): number | null {
    if (this.repDataList.length === 0) return null;
    return this.repDataList[this.repDataList.length - 1].estimatedRpe;
  }

  public getLatestEstimated1Rm(): number | null {
    if (this.repDataList.length === 0) return null;
    return this.repDataList[this.repDataList.length - 1].estimated1RmKg || null;
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
