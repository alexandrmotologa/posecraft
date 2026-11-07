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

export class BenchPressRule implements ExerciseRule {
  public id = 'bench_press';
  public name = 'Barbell & Dumbbell Bench Press';
  public category = 'barbell' as const;
  public cameraPerspective = 'any' as const;
  public primaryMetricLabel = 'Elbow Press Angle';
  public primaryMetricUnit = '°';
  public description = 'Touch point depth, elbow lockout, and shoulder flare protection (45°–70°).';
  public instructions = [
    'Position camera at 45 degrees or from head of bench.',
    'Start with bar directly above shoulders at full lockout.',
    'Lower bar with control to lower sternum, keeping elbows tucked at 45 to 70 degrees.',
    'Press upward and lock out symmetrically.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    elbow_flare: 0,
    asymmetric_press: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 165, // full lockout
      inflectionThreshold: 135,
      peakRomThreshold: 75, // chest touch depth
      isDescendingPhase: true,
      minRepDurationMs: 400,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Left and right elbow angles
    const leftElbow = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_ELBOW],
      lm[LandmarkIndex.LEFT_WRIST]
    );
    const rightElbow = calculateAngle2D(
      lm[LandmarkIndex.RIGHT_SHOULDER],
      lm[LandmarkIndex.RIGHT_ELBOW],
      lm[LandmarkIndex.RIGHT_WRIST]
    );
    const elbowAngle = Math.round((leftElbow + rightElbow) / 2);

    // Elbow flare angle relative to torso (shoulder-to-hip vector)
    const leftFlare = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_ELBOW]
    );
    const rightFlare = calculateAngle2D(
      lm[LandmarkIndex.RIGHT_HIP],
      lm[LandmarkIndex.RIGHT_SHOULDER],
      lm[LandmarkIndex.RIGHT_ELBOW]
    );
    const avgFlare = (leftFlare + rightFlare) / 2;

    // Asymmetry between left and right arm
    const pressDiff = Math.abs(leftElbow - rightElbow);

    if (avgFlare > 78 && elbowAngle < 120) {
      alerts.push({
        id: 'elbow_flare',
        name: 'Elbow Flare Hazard',
        message: 'Tuck elbows closer to ribs (45°–70°) to prevent shoulder impingement.',
        level: 'warning',
        currentValue: Math.round(avgFlare),
        thresholdValue: 75,
        timestampMs,
      });
      this.stateMachine.recordFault('elbow_flare');
      this.faultCounts.elbow_flare++;
    }

    if (pressDiff > 18) {
      alerts.push({
        id: 'asymmetric_press',
        name: 'Asymmetric Press',
        message: 'Uneven arm drive detected: Balance pressing force through both sides.',
        level: 'warning',
        currentValue: Math.round(pressDiff),
        thresholdValue: 15,
        timestampMs,
      });
      this.stateMachine.recordFault('asymmetric_press');
      this.faultCounts.asymmetric_press++;
    }

    this.stateMachine.update(elbowAngle, timestampMs);

    let formScore = 100;
    if (avgFlare > 75) formScore -= 20;
    if (pressDiff > 15) formScore -= 15;

    return {
      timestampMs,
      angles: {
        elbowAngle,
        leftElbow: Math.round(leftElbow),
        rightElbow: Math.round(rightElbow),
        flareAngle: Math.round(avgFlare),
      },
      distances: {
        armAsymmetryDegrees: Math.round(pressDiff),
      },
      primaryMetric: elbowAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isChestDepth: elbowAngle <= 75,
        isLockout: elbowAngle >= 165,
        isSymmetric: pressDiff <= 12,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { elbow_flare: 0, asymmetric_press: 0 };
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
