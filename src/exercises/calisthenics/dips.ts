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

export class DipsRule implements ExerciseRule {
  public id = 'dips';
  public name = 'Parallel & Ring Dips';
  public category = 'calisthenics' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Elbow Depth Angle';
  public primaryMetricUnit = '°';
  public description = 'Depth (elbow <= 90°), top lockout (>165°), and anterior shoulder dump prevention.';
  public instructions = [
    'Position camera at side profile at waist height.',
    'Begin supported on bars with elbows locked out at top.',
    'Descend under control until shoulders reach or pass elbow crease (90 degrees).',
    'Keep chest proud and avoid excessive forward shoulder dump.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    shoulder_dump: 0,
    shallow_depth: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 165,
      inflectionThreshold: 135,
      peakRomThreshold: 90,
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

    // Forward shoulder dump: angle of torso / shoulder tilt relative to vertical
    const torsoLean = calculateVerticalAngle(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER]
    );

    if (torsoLean > 38 && elbowAngle < 100) {
      alerts.push({
        id: 'shoulder_dump',
        name: 'Shoulder Dump',
        message: 'Excessive forward shoulder dump: Retract scapulae and protect anterior capsule.',
        level: 'warning',
        currentValue: Math.round(torsoLean),
        thresholdValue: 35,
        timestampMs,
      });
      this.stateMachine.recordFault('shoulder_dump');
      this.faultCounts.shoulder_dump++;
    }

    this.stateMachine.update(elbowAngle, timestampMs);

    let formScore = 100;
    if (torsoLean > 35) formScore -= 25;

    return {
      timestampMs,
      angles: {
        elbowAngle,
        torsoLean: Math.round(torsoLean),
      },
      distances: {},
      primaryMetric: elbowAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isDepthValid: elbowAngle <= 90,
        isLockout: elbowAngle >= 165,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { shoulder_dump: 0, shallow_depth: 0 };
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
