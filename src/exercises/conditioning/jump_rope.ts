import {
  ExerciseRule,
  Skeleton,
  UserBaseline,
  FrameMetrics,
  ExerciseSummary,
  LandmarkIndex,
  SafetyAlert,
} from '../../engine/types';
import { calculateUserBaseline } from '../../engine/normalizer';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class JumpRopeRule implements ExerciseRule {
  public id = 'jump_rope';
  public name = 'Jump Rope & Double Unders';
  public category = 'conditioning' as const;
  public cameraPerspective = 'front_facing' as const;
  public primaryMetricLabel = 'Jump Cadence';
  public primaryMetricUnit = 'RPM';
  public description = 'Jump cadence (RPM), ground contact time, and vertical rhythm symmetry.';
  public instructions = [
    'Position camera facing directly toward you with full body and feet in frame.',
    'Jump with ankles bouncing rhythmically off balls of feet.',
    'Maintain tall posture with minimal knee bend.',
    'Engine measures jump frequency (RPM) and bilateral landing symmetry.',
  ];

  private stateMachine: RepetitionStateMachine;
  private baselineAnkleY: number | null = null;
  private jumpTimestamps: number[] = [];
  private faultCounts: Record<string, number> = {
    asymmetric_landing: 0,
    knee_tuck: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 2, // on floor (cm elevation)
      inflectionThreshold: 5,
      peakRomThreshold: 8, // airborne apex
      isDescendingPhase: false, // elevation INCREASES
      minRepDurationMs: 250, // fast cadence
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_ANKLE]) {
      this.baselineAnkleY = (lm[LandmarkIndex.LEFT_ANKLE].y + lm[LandmarkIndex.RIGHT_ANKLE].y) / 2;
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    const leftAnkleY = lm[LandmarkIndex.LEFT_ANKLE].y;
    const rightAnkleY = lm[LandmarkIndex.RIGHT_ANKLE].y;
    const avgAnkleY = (leftAnkleY + rightAnkleY) / 2;

    if (this.baselineAnkleY === null) {
      this.baselineAnkleY = avgAnkleY;
    }

    // Elevation in cm (in screen coordinates, airborne means lower y)
    const elevationNorm = Math.max(0, this.baselineAnkleY - avgAnkleY) / (baseline.torsoLength || 0.35);
    const elevationCm = Math.round(elevationNorm * 50);

    // Bilateral landing asymmetry
    const ankleDiffCm = Math.abs(leftAnkleY - rightAnkleY) * 100;
    if (ankleDiffCm > 6) {
      alerts.push({
        id: 'asymmetric_landing',
        name: 'Asymmetric Landing',
        message: 'Uneven landing: Balance impact evenly across both feet.',
        level: 'warning',
        timestampMs,
      });
      this.faultCounts.asymmetric_landing++;
    }

    const completedRep = this.stateMachine.update(elevationCm, timestampMs);
    if (completedRep) {
      this.jumpTimestamps.push(timestampMs);
      if (this.jumpTimestamps.length > 20) this.jumpTimestamps.shift();
    }

    // Calculate rolling RPM
    let currentRpm = 0;
    if (this.jumpTimestamps.length >= 2) {
      const windowMs = this.jumpTimestamps[this.jumpTimestamps.length - 1] - this.jumpTimestamps[0];
      if (windowMs > 0) {
        currentRpm = Math.round(((this.jumpTimestamps.length - 1) / (windowMs / 1000)) * 60);
      }
    }

    let formScore = 100;
    if (ankleDiffCm > 5) formScore -= 20;

    return {
      timestampMs,
      angles: {},
      distances: {
        jumpHeightCm: elevationCm,
        cadenceRpm: currentRpm,
      },
      primaryMetric: currentRpm,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        currentRpm,
        isAirborne: elevationCm >= 6,
        bilateralSymmetry: ankleDiffCm <= 4,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.baselineAnkleY = null;
    this.jumpTimestamps = [];
    this.faultCounts = { asymmetric_landing: 0, knee_tuck: 0 };
  }

  public getSummary(): ExerciseSummary {
    const reps = this.stateMachine.getRepHistory();
    const validReps = reps.filter(r => r.passed).length;
    const avgRom = reps.length > 0 ? reps.reduce((acc, r) => acc + r.peakRom, 0) / reps.length : 0;
    const avgConcentric = reps.length > 0 ? reps.reduce((acc, r) => acc + r.concentricMs, 0) / reps.length : 0;
    const avgEccentric = reps.length > 0 ? reps.reduce((acc, r) => acc + r.eccentricMs, 0) / reps.length : 0;

    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: this.stateMachine.getRepCount(),
      validReps,
      averageRom: Math.round(avgRom),
      averageFormScore: reps.length > 0 ? Math.round(reps.reduce((acc, r) => acc + r.romScore, 0) / reps.length) : 100,
      averageConcentricMs: Math.round(avgConcentric),
      averageEccentricMs: Math.round(avgEccentric),
      totalDurationMs: reps.reduce((acc, r) => acc + r.durationMs, 0),
      faultCounts: { ...this.faultCounts },
    };
  }
}
