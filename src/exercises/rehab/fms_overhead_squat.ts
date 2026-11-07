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
import { calculateAngle2D, calculateVerticalAngle } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class FmsOverheadSquatRule implements ExerciseRule {
  public id = 'fms_overhead_squat';
  public name = 'FMS Overhead Squat Mobility Screen';
  public category = 'rehab' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'FMS Clinical Score';
  public primaryMetricUnit = '/3';
  public description = 'Clinical FMS standard: tests thoracic mobility, ankle dorsiflexion, and hip depth.';
  public instructions = [
    'Position camera at side profile at waist height.',
    'Hold dowel or arms overhead with elbows locked and feet shoulder-width apart.',
    'Descend as deep as possible with upright torso and heels flat on floor.',
    'Keep arms overhead in line with torso; do not let arms pitch forward.',
  ];

  private stateMachine: RepetitionStateMachine;
  private baselineHeelY: number | null = null;
  private fmsScore: number = 3;
  private faultCounts: Record<string, number> = {
    arms_forward: 0,
    heels_lifted: 0,
    shallow_depth: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 165,
      inflectionThreshold: 140,
      peakRomThreshold: 88,
      isDescendingPhase: true,
      minRepDurationMs: 600,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_HEEL]) {
      this.baselineHeelY = lm[LandmarkIndex.LEFT_HEEL].y;
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Knee angle
    const kneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    // Torso angle relative to vertical
    const torsoLean = calculateVerticalAngle(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER]
    );

    // Arm angle relative to torso (wrist -> shoulder -> hip)
    const armTorsoAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_WRIST],
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP]
    );

    // Heel lift check (ankle dorsiflexion limitation)
    const heel = lm[LandmarkIndex.LEFT_HEEL];
    const isHeelLifted = this.baselineHeelY !== null && heel.y < this.baselineHeelY - 0.03;

    // In FMS: arms should remain inline with torso (armTorsoAngle >= 165°)
    const isArmsFallingForward = armTorsoAngle < 150 && kneeAngle < 120;

    let currentRepScore = 3;

    if (isArmsFallingForward) {
      currentRepScore = Math.min(currentRepScore, 2);
      alerts.push({
        id: 'thoracic_drop',
        name: 'Thoracic Mobility Limitation',
        message: 'Arms falling forward: Thoracic spine tightness or shoulder restriction.',
        level: 'warning',
        currentValue: Math.round(armTorsoAngle),
        thresholdValue: 160,
        timestampMs,
      });
      this.stateMachine.recordFault('arms_forward');
      this.faultCounts.arms_forward++;
    }

    if (isHeelLifted) {
      currentRepScore = Math.min(currentRepScore, 2);
      alerts.push({
        id: 'ankle_restriction',
        name: 'Ankle Dorsiflexion Limitation',
        message: 'Heels lifting off floor: Calves or ankles restricted.',
        level: 'warning',
        timestampMs,
      });
      this.stateMachine.recordFault('heels_lifted');
      this.faultCounts.heels_lifted++;
    }

    if (kneeAngle > 92 && this.stateMachine.getState() === 'PEAK') {
      currentRepScore = 1;
      this.faultCounts.shallow_depth++;
    }

    this.fmsScore = currentRepScore;
    this.stateMachine.update(Math.round(kneeAngle), timestampMs);

    return {
      timestampMs,
      angles: {
        kneeAngle: Math.round(kneeAngle),
        armTorsoAngle: Math.round(armTorsoAngle),
        torsoLean: Math.round(torsoLean),
      },
      distances: {
        fmsScore: this.fmsScore,
      },
      primaryMetric: this.fmsScore,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        clinicalFmsGrade: `${this.fmsScore} / 3`,
        heelsFlat: !isHeelLifted,
        armsParallel: !isArmsFallingForward,
        femurBelowParallel: kneeAngle <= 90,
      },
      formScore: this.fmsScore === 3 ? 100 : this.fmsScore === 2 ? 75 : 50,
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.baselineHeelY = null;
    this.fmsScore = 3;
    this.faultCounts = { arms_forward: 0, heels_lifted: 0, shallow_depth: 0 };
  }

  public getSummary(): ExerciseSummary {
    const reps = this.stateMachine.getRepHistory();
    const validReps = reps.filter(r => r.passed).length;

    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: this.stateMachine.getRepCount(),
      validReps,
      averageRom: this.fmsScore,
      averageFormScore: this.fmsScore * 33,
      averageConcentricMs: 0,
      averageEccentricMs: 0,
      totalDurationMs: 0,
      faultCounts: { ...this.faultCounts },
    };
  }
}
