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
import { calculateAngle2D, calculateSpineCurvature, midpoint2D } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class DeadliftRule implements ExerciseRule {
  public id = 'deadlift';
  public name = 'Deadlift (Conventional & Sumo)';
  public category = 'barbell' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Hip Lockout Angle';
  public primaryMetricUnit = '°';
  public description = 'Spinal curvature alert (Δθspine > 20°), vertical bar trajectory, and full hip lockout at apex.';
  public instructions = [
    'Position camera directly at your side (sagittal view) at knee height.',
    'Set up with neutral spine and bar over midfoot.',
    'Drive floor away, locking knees and hips simultaneously at top.',
    'Keep spine rigid; do not round your lower back under load.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    lumbar_rounding: 0,
    soft_lockout: 0,
    hyperextension: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 75, // flexed hip hinge at floor
      inflectionThreshold: 110, // pulling upward
      peakRomThreshold: 170, // standing tall lockout
      isDescendingPhase: false, // angle INCREASES as you stand up!
      minRepDurationMs: 500,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Hip angle: shoulder -> hip -> knee
    const hipAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE]
    );

    // Knee angle
    const kneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    // Spine curvature approximation: cervical (nose/ear) -> shoulder -> hip
    const ear = lm[LandmarkIndex.LEFT_EAR];
    const shoulder = lm[LandmarkIndex.LEFT_SHOULDER];
    const hip = lm[LandmarkIndex.LEFT_HIP];
    const spineDeviation = calculateSpineCurvature(ear, shoulder, hip);

    // Instant lumbar flexion warning if spine rounds past 20 degrees
    if (spineDeviation > 20) {
      alerts.push({
        id: 'lumbar_rounding',
        name: 'Lumbar Rounding Alert',
        message: 'Spinal flexion detected! Engage lats, brace core, and maintain neutral lumbar spine.',
        level: 'danger',
        currentValue: Math.round(spineDeviation),
        thresholdValue: 20,
        timestampMs,
      });
      this.stateMachine.recordFault('lumbar_rounding');
      this.faultCounts.lumbar_rounding++;
    }

    // Apex hyperextension warning: leaning back excessively at lockout
    if (hipAngle > 188) {
      alerts.push({
        id: 'hyperextension',
        name: 'Lumbar Hyperextension',
        message: 'Do not hyperextend lumbar spine at top: Lock out using glute squeeze.',
        level: 'warning',
        currentValue: Math.round(hipAngle),
        thresholdValue: 185,
        timestampMs,
      });
      this.stateMachine.recordFault('hyperextension');
      this.faultCounts.hyperextension++;
    }

    this.stateMachine.update(hipAngle, timestampMs);

    let formScore = 100;
    if (spineDeviation > 18) formScore -= Math.min(50, (spineDeviation - 18) * 3);
    if (hipAngle > 188) formScore -= 15;

    // Approximate barbell position from wrists
    const midWrist = midpoint2D(lm[LandmarkIndex.LEFT_WRIST], lm[LandmarkIndex.RIGHT_WRIST]);

    return {
      timestampMs,
      angles: {
        hipAngle: Math.round(hipAngle),
        kneeAngle: Math.round(kneeAngle),
        spineCurvature: Math.round(spineDeviation),
      },
      distances: {
        barHorizontalOffset: parseFloat(midWrist.x.toFixed(3)),
      },
      primaryMetric: Math.round(hipAngle),
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isLockout: hipAngle >= 170 && hipAngle <= 185,
        isSpineNeutral: spineDeviation <= 16,
        kneeLockout: kneeAngle >= 165,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { lumbar_rounding: 0, soft_lockout: 0, hyperextension: 0 };
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
