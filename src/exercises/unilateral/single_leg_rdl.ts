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
import { calculateAngle2D, calculateHorizontalAngle } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class SingleLegRdlRule implements ExerciseRule {
  public id = 'single_leg_rdl';
  public name = 'Single-Leg Romanian Deadlift (RDL)';
  public category = 'unilateral' as const;
  public cameraPerspective = 'any' as const;
  public primaryMetricLabel = 'Hip Hinge Angle';
  public primaryMetricUnit = '°';
  public description = 'Pelvic rotation detector keeping hips parallel to floor, with hinge depth scoring.';
  public instructions = [
    'Position camera at side profile or 45 degrees.',
    'Stand on one leg with a soft bend at the knee.',
    'Hinge back at the hip, extending trailing leg straight behind in line with torso.',
    'Keep pelvis square to the floor; do not rotate hip open toward ceiling.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    pelvic_twist: 0,
    shallow_hinge: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 165, // standing
      inflectionThreshold: 135,
      peakRomThreshold: 85, // deep hip hinge
      isDescendingPhase: true,
      minRepDurationMs: 500,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Standing leg hip angle
    const hipAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE]
    );

    // Pelvic tilt / rotation check: horizontal angle between left and right hip
    const pelvicTiltAngle = calculateHorizontalAngle(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.RIGHT_HIP]
    );

    // If pelvis twists open past 16 degrees from horizontal
    if (this.stateMachine.getState() === 'CONCENTRIC' && pelvicTiltAngle > 16) {
      alerts.push({
        id: 'pelvic_twist',
        name: 'Pelvic Rotation Fault',
        message: 'Pelvis twisting open: Point trailing toe toward floor to square hips.',
        level: 'warning',
        currentValue: Math.round(pelvicTiltAngle),
        thresholdValue: 14,
        timestampMs,
      });
      this.stateMachine.recordFault('pelvic_twist');
      this.faultCounts.pelvic_twist++;
    }

    this.stateMachine.update(Math.round(hipAngle), timestampMs);

    let formScore = 100;
    if (pelvicTiltAngle > 14) formScore -= 25;

    return {
      timestampMs,
      angles: {
        hipHingeAngle: Math.round(hipAngle),
        pelvicRotation: Math.round(pelvicTiltAngle),
      },
      distances: {},
      primaryMetric: Math.round(hipAngle),
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isSquarePelvis: pelvicTiltAngle <= 14,
        isHinged: hipAngle <= 85,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { pelvic_twist: 0, shallow_hinge: 0 };
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
