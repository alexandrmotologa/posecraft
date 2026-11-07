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
import { calculateAngle2D } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class LateralRaisesRule implements ExerciseRule {
  public id = 'lateral_raises';
  public name = 'Dumbbell Lateral Raises';
  public category = 'barbell' as const;
  public cameraPerspective = 'front_facing' as const;
  public primaryMetricLabel = 'Arm Abduction Angle';
  public primaryMetricUnit = '°';
  public description = 'Abduction to horizontal (80°–90°) with trapezius shrugging prevention filter.';
  public instructions = [
    'Stand facing the camera directly (frontal view).',
    'Start with dumbbells at your sides with soft elbow bend.',
    'Raise arms outward until upper arms are parallel to the floor (80° to 90°).',
    'Keep neck relaxed; do not shrug shoulders upward using upper trapezius.',
  ];

  private stateMachine: RepetitionStateMachine;
  private baselineShoulderY: number | null = null;
  private faultCounts: Record<string, number> = {
    trap_shrug: 0,
    shallow_raise: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 20, // arms resting down at hips
      inflectionThreshold: 45,
      peakRomThreshold: 80, // arm horizontal abduction
      isDescendingPhase: false, // angle INCREASES as arms raise
      minRepDurationMs: 400,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_SHOULDER]) {
      this.baselineShoulderY = (lm[LandmarkIndex.LEFT_SHOULDER].y + lm[LandmarkIndex.RIGHT_SHOULDER].y) / 2;
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Abduction angle: hip -> shoulder -> elbow
    const leftAbduction = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_ELBOW]
    );
    const rightAbduction = calculateAngle2D(
      lm[LandmarkIndex.RIGHT_HIP],
      lm[LandmarkIndex.RIGHT_SHOULDER],
      lm[LandmarkIndex.RIGHT_ELBOW]
    );
    const avgAbduction = Math.round((leftAbduction + rightAbduction) / 2);

    // Trapezius shrugging filter: vertical displacement of shoulders toward ears
    const currentShoulderY = (lm[LandmarkIndex.LEFT_SHOULDER].y + lm[LandmarkIndex.RIGHT_SHOULDER].y) / 2;
    if (this.baselineShoulderY === null) {
      this.baselineShoulderY = currentShoulderY;
    }

    // In screen coordinates, shrugging upward means lower y
    const shrugDistance = (this.baselineShoulderY - currentShoulderY) / (baseline.torsoLength || 0.35);

    if (shrugDistance > 0.08 && avgAbduction > 50) {
      alerts.push({
        id: 'trap_shrug',
        name: 'Trapezius Shrug Compensation',
        message: 'Depress shoulders: Do not shrug with traps, isolate lateral deltoids.',
        level: 'warning',
        currentValue: Math.round(shrugDistance * 100),
        thresholdValue: 8,
        timestampMs,
      });
      this.stateMachine.recordFault('trap_shrug');
      this.faultCounts.trap_shrug++;
    }

    this.stateMachine.update(avgAbduction, timestampMs);

    let formScore = 100;
    if (shrugDistance > 0.08) formScore -= 25;
    if (Math.abs(leftAbduction - rightAbduction) > 15) formScore -= 15;

    return {
      timestampMs,
      angles: {
        abductionAngle: avgAbduction,
        leftAbduction: Math.round(leftAbduction),
        rightAbduction: Math.round(rightAbduction),
      },
      distances: {
        shrugRatio: parseFloat(shrugDistance.toFixed(2)),
      },
      primaryMetric: avgAbduction,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isHorizontal: avgAbduction >= 80 && avgAbduction <= 95,
        isStrictNoShrug: shrugDistance <= 0.08,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.baselineShoulderY = null;
    this.faultCounts = { trap_shrug: 0, shallow_raise: 0 };
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
