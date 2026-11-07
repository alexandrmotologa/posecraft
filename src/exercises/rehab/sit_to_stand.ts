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

export class SitToStandRule implements ExerciseRule {
  public id = 'sit_to_stand';
  public name = '30-Second Chair Sit-to-Stand Test';
  public category = 'rehab' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Knee Extension Angle';
  public primaryMetricUnit = '°';
  public description = 'Clinical 30-second functional independence and lower extremity power screening test.';
  public instructions = [
    'Sit on a standard chair with arms folded across chest; place camera at side profile.',
    'On start, stand up completely to full lockout, then return to seated position.',
    'Perform as many full repetitions as possible in 30 seconds without pushing off thighs.',
    'Engine tallies score and benchmarks functional fall risk.',
  ];

  private stateMachine: RepetitionStateMachine;
  private testStartTimestamp: number | null = null;
  private isTestCompleted: boolean = false;

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 90, // seated on chair (hip/knee ~90°)
      inflectionThreshold: 120, // rising upward
      peakRomThreshold: 168, // full upright stand lockout
      isDescendingPhase: false, // angle INCREASES as you stand up
      minRepDurationMs: 600,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    if (this.testStartTimestamp === null) {
      this.testStartTimestamp = timestampMs;
    }

    const elapsedSeconds = Math.min(30, Math.floor((timestampMs - this.testStartTimestamp) / 1000));
    const remainingSeconds = Math.max(0, 30 - elapsedSeconds);

    if (remainingSeconds === 0) {
      this.isTestCompleted = true;
    }

    // Knee angle
    const kneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    // Reps are counted only while 30s timer is active
    if (!this.isTestCompleted) {
      this.stateMachine.update(Math.round(kneeAngle), timestampMs);
    }

    const completedReps = this.stateMachine.getRepCount();

    // Clinical norm: >=14 reps in 30s is normal for adults
    // < 10 reps indicates high sarcopenia / fall risk
    let fallRisk = 'Low Risk';
    if (completedReps < 8 && this.isTestCompleted) fallRisk = 'High Fall Risk';
    else if (completedReps < 12 && this.isTestCompleted) fallRisk = 'Moderate Risk';

    return {
      timestampMs,
      angles: {
        kneeAngle: Math.round(kneeAngle),
      },
      distances: {
        remainingSeconds,
      },
      primaryMetric: Math.round(kneeAngle),
      repState: this.stateMachine.getState(),
      repCount: completedReps,
      activeAlerts: alerts,
      telemetry: {
        completedReps,
        remainingSeconds,
        isTestCompleted: this.isTestCompleted,
        clinicalFallRisk: fallRisk,
      },
      formScore: 100,
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.testStartTimestamp = null;
    this.isTestCompleted = false;
  }

  public getSummary(): ExerciseSummary {
    const reps = this.stateMachine.getRepHistory();
    const count = this.stateMachine.getRepCount();
    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: count,
      validReps: count,
      averageRom: 170,
      averageFormScore: count >= 12 ? 100 : count >= 8 ? 75 : 50,
      averageConcentricMs: reps.length > 0 ? Math.round(reps.reduce((a, b) => a + b.concentricMs, 0) / reps.length) : 0,
      averageEccentricMs: reps.length > 0 ? Math.round(reps.reduce((a, b) => a + b.eccentricMs, 0) / reps.length) : 0,
      totalDurationMs: 30000,
      faultCounts: {},
    };
  }
}
