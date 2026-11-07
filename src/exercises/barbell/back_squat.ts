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
import { calculateAngle2D, calculateKneeValgusRatio, midpoint2D } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class BackSquatRule implements ExerciseRule {
  public id = 'back_squat';
  public name = 'Back & Front Squat';
  public category = 'barbell' as const;
  public cameraPerspective = 'any' as const; // can evaluate depth from side or valgus from front
  public primaryMetricLabel = 'Knee Flexion Depth';
  public primaryMetricUnit = '°';
  public description = 'Depth below parallel (femur-tibia <90°), vertical bar-path over midfoot, and knee valgus collapse alert.';
  public instructions = [
    'Position camera 2 to 3 meters away at knee-to-waist height (side profile or 45 degrees).',
    'Begin tall with knees and hips locked out.',
    'Descend until hip crease breaks below the top of the patella (<90 degrees).',
    'Drive out of the hole without allowing knees to cave inward.',
  ];

  private stateMachine: RepetitionStateMachine;
  private barTrajectory: { x: number; y: number }[] = [];
  private faultCounts: Record<string, number> = {
    knee_valgus: 0,
    shallow_depth: 0,
    excessive_forward_lean: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 165, // standing lockout
      inflectionThreshold: 140, // initiating descent
      peakRomThreshold: 85, // below parallel depth
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

    // Left and right knee angles
    const leftKneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );
    const rightKneeAngle = calculateAngle2D(
      lm[LandmarkIndex.RIGHT_HIP],
      lm[LandmarkIndex.RIGHT_KNEE],
      lm[LandmarkIndex.RIGHT_ANKLE]
    );
    const kneeAngle = Math.round((leftKneeAngle + rightKneeAngle) / 2);

    // Knee valgus index: ratio of knee width to ankle width
    const valgusRatio = calculateKneeValgusRatio(
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.RIGHT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE],
      lm[LandmarkIndex.RIGHT_ANKLE]
    );

    // Track simulated or actual bar position (shoulders)
    const midShoulder = midpoint2D(lm[LandmarkIndex.LEFT_SHOULDER], lm[LandmarkIndex.RIGHT_SHOULDER]);
    this.barTrajectory.push({ x: midShoulder.x, y: midShoulder.y });
    if (this.barTrajectory.length > 90) this.barTrajectory.shift();

    // Check for knee valgus during descent, bottom, or ascent
    if (kneeAngle < 130 && valgusRatio < 0.82) {
      alerts.push({
        id: 'knee_valgus',
        name: 'Knee Valgus Collapse',
        message: 'Knee valgus detected: Push knees outward in line with your toes.',
        level: 'danger',
        currentValue: parseFloat(valgusRatio.toFixed(2)),
        thresholdValue: 0.85,
        timestampMs,
      });
      this.stateMachine.recordFault('knee_valgus');
      this.faultCounts.knee_valgus++;
    }

    this.stateMachine.update(kneeAngle, timestampMs);

    let formScore = 100;
    if (valgusRatio < 0.85) formScore -= 25;
    if (this.stateMachine.getState() === 'PEAK' && kneeAngle > 88) formScore -= 15;

    return {
      timestampMs,
      angles: {
        kneeAngle,
        leftKnee: Math.round(leftKneeAngle),
        rightKnee: Math.round(rightKneeAngle),
      },
      distances: {
        valgusRatio: parseFloat(valgusRatio.toFixed(2)),
      },
      primaryMetric: kneeAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isBelowParallel: kneeAngle <= 88,
        kneeValgusFlag: valgusRatio < 0.82,
        isLockout: kneeAngle >= 165,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.barTrajectory = [];
    this.faultCounts = { knee_valgus: 0, shallow_depth: 0, excessive_forward_lean: 0 };
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
