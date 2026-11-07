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

export class BoxingShadowRule implements ExerciseRule {
  public id = 'boxing_shadow';
  public name = 'Boxing Guard & Punch Extension';
  public category = 'conditioning' as const;
  public cameraPerspective = 'front_facing' as const;
  public primaryMetricLabel = 'Punch Extension';
  public primaryMetricUnit = '°';
  public description = 'Guard check (hands protect chin), full elbow extension on punches, and head slip tracking.';
  public instructions = [
    'Stand facing camera in boxing stance at arms length.',
    'Keep rear hand glued to chin while throwing lead jab or rear cross.',
    'Snap punches to full extension (~170 degrees) and retract immediately.',
    'Do not drop rear hand during punches.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    dropped_guard: 0,
    short_punch: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 70, // guard position at chin
      inflectionThreshold: 110,
      peakRomThreshold: 165, // full punch extension
      isDescendingPhase: false, // angle INCREASES as punch extends
      minRepDurationMs: 250,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Left and right elbow extension
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

    // Punching arm is the more extended one
    const punchingArmAngle = Math.max(leftElbow, rightElbow);
    const isLeftPunching = leftElbow >= rightElbow;

    // Check guard of the NON-punching hand (must remain near chin / shoulder Y)
    const guardWrist = isLeftPunching ? lm[LandmarkIndex.RIGHT_WRIST] : lm[LandmarkIndex.LEFT_WRIST];
    const shoulder = isLeftPunching ? lm[LandmarkIndex.RIGHT_SHOULDER] : lm[LandmarkIndex.LEFT_SHOULDER];

    // If guard hand drops below shoulder line while throwing punch
    const isGuardDropped = guardWrist.y > shoulder.y && punchingArmAngle > 130;

    if (isGuardDropped) {
      alerts.push({
        id: 'dropped_guard',
        name: 'Dropped Guard Hazard',
        message: 'Rear hand dropped! Keep opposite hand protecting your jaw.',
        level: 'warning',
        timestampMs,
      });
      this.stateMachine.recordFault('dropped_guard');
      this.faultCounts.dropped_guard++;
    }

    this.stateMachine.update(Math.round(punchingArmAngle), timestampMs);

    let formScore = 100;
    if (isGuardDropped) formScore -= 25;

    return {
      timestampMs,
      angles: {
        punchExtension: Math.round(punchingArmAngle),
        leftElbow: Math.round(leftElbow),
        rightElbow: Math.round(rightElbow),
      },
      distances: {},
      primaryMetric: Math.round(punchingArmAngle),
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        guardMaintained: !isGuardDropped,
        fullPunchExtension: punchingArmAngle >= 165,
        leadArm: isLeftPunching ? 'Left' : 'Right',
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { dropped_guard: 0, short_punch: 0 };
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
