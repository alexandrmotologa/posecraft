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
import { calculateAngle2D, calculateUnilateralValgus } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class BulgarianSquatRule implements ExerciseRule {
  public id = 'bulgarian_squat';
  public name = 'Bulgarian Split Squat';
  public category = 'unilateral' as const;
  public cameraPerspective = 'any' as const;
  public primaryMetricLabel = 'Working Knee Depth';
  public primaryMetricUnit = '°';
  public description = 'Left vs. Right Symmetry Matrix comparing ROM and tempo, with Knee Valgus collapse alert.';
  public instructions = [
    'Elevate rear foot on bench behind you; place camera at 45 degrees.',
    'Lower working hip until front thigh is parallel to ground (<90°).',
    'Track working knee directly over middle of front foot (avoid valgus).',
    'Perform equal reps on left and right leg to benchmark symmetry.',
  ];

  private stateMachine: RepetitionStateMachine;
  private leftRepsRom: number[] = [];
  private rightRepsRom: number[] = [];
  private faultCounts: Record<string, number> = {
    knee_valgus: 0,
    shallow_depth: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 165,
      inflectionThreshold: 135,
      peakRomThreshold: 90,
      isDescendingPhase: true,
      minRepDurationMs: 450,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    const leftKnee = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );
    const rightKnee = calculateAngle2D(
      lm[LandmarkIndex.RIGHT_HIP],
      lm[LandmarkIndex.RIGHT_KNEE],
      lm[LandmarkIndex.RIGHT_ANKLE]
    );

    // Front working leg has lower ankle y (closer to floor and front)
    const isLeftWorking = lm[LandmarkIndex.LEFT_ANKLE].y >= lm[LandmarkIndex.RIGHT_ANKLE].y - 0.05;
    const workingKnee = isLeftWorking ? leftKnee : rightKnee;

    // Front knee valgus check
    const workingHip = isLeftWorking ? lm[LandmarkIndex.LEFT_HIP] : lm[LandmarkIndex.RIGHT_HIP];
    const workingKneePt = isLeftWorking ? lm[LandmarkIndex.LEFT_KNEE] : lm[LandmarkIndex.RIGHT_KNEE];
    const workingAnkle = isLeftWorking ? lm[LandmarkIndex.LEFT_ANKLE] : lm[LandmarkIndex.RIGHT_ANKLE];
    const valgusRatio = calculateUnilateralValgus(workingHip, workingKneePt, workingAnkle);

    if (this.stateMachine.getState() === 'ECCENTRIC' && valgusRatio < 0.82) {
      alerts.push({
        id: 'valgus_bulgarian',
        name: 'Knee Valgus Alert',
        message: 'Front knee collapsing inward: Push knee out over pinky toe.',
        level: 'danger',
        currentValue: parseFloat(valgusRatio.toFixed(2)),
        thresholdValue: 0.85,
        timestampMs,
      });
      this.stateMachine.recordFault('knee_valgus');
      this.faultCounts.knee_valgus++;
    }

    const completed = this.stateMachine.update(Math.round(workingKnee), timestampMs);
    if (completed) {
      if (isLeftWorking) {
        this.leftRepsRom.push(completed.peakRom);
      } else {
        this.rightRepsRom.push(completed.peakRom);
      }
    }

    // Symmetry index calculation
    const avgLeft = this.leftRepsRom.length > 0 ? this.leftRepsRom.reduce((a, b) => a + b, 0) / this.leftRepsRom.length : 90;
    const avgRight = this.rightRepsRom.length > 0 ? this.rightRepsRom.reduce((a, b) => a + b, 0) / this.rightRepsRom.length : 90;
    const symmetryScore = Math.max(0, Math.round(100 - Math.abs(avgLeft - avgRight) * 2));

    let formScore = 100;
    if (valgusRatio < 0.82) formScore -= 25;

    return {
      timestampMs,
      angles: {
        workingKnee: Math.round(workingKnee),
        leftKnee: Math.round(leftKnee),
        rightKnee: Math.round(rightKnee),
      },
      distances: {
        symmetryScore,
      },
      primaryMetric: Math.round(workingKnee),
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        activeLeg: isLeftWorking ? 'Left' : 'Right',
        symmetryScore,
        depthMet: workingKnee <= 90,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.leftRepsRom = [];
    this.rightRepsRom = [];
    this.faultCounts = { knee_valgus: 0, shallow_depth: 0 };
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
