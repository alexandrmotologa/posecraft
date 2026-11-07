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
import { calculateAngle2D, calculateCollinearityDeviation } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class PushUpsRule implements ExerciseRule {
  public id = 'push_ups';
  public name = 'Push-Ups';
  public category = 'calisthenics' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Elbow Depth Angle';
  public primaryMetricUnit = '°';
  public description = 'Elbow lockout at apex (>165°), chest depth (elbow <= 90°), and trunk collinearity.';
  public instructions = [
    'Place camera directly at your side in horizontal view.',
    'Maintain a straight rigid plank line from heels through hips to shoulders.',
    'Descend until elbows reach 90 degrees or chest nears floor.',
    'Lock out arms completely at top without dropping your hips.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    hip_sag: 0,
    hip_pike: 0,
    shallow_depth: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 165, // top lockout
      inflectionThreshold: 135,
      peakRomThreshold: 90, // chest depth <= 90
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

    // Measure elbow flexion
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

    // Measure trunk collinearity: ankle -> hip -> shoulder
    const trunkDeviation = calculateCollinearityDeviation(
      lm[LandmarkIndex.LEFT_ANKLE],
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER]
    );

    // Check if hips are sagging (hip Y lower than line) or piking (hip Y higher than line)
    if (trunkDeviation > 15) {
      const hip = lm[LandmarkIndex.LEFT_HIP];
      const shoulder = lm[LandmarkIndex.LEFT_SHOULDER];
      const ankle = lm[LandmarkIndex.LEFT_ANKLE];
      const expectedHipY = (shoulder.y + ankle.y) / 2;

      if (hip.y > expectedHipY + 0.04) {
        // Hip sag (in screen coordinates, larger y is lower down)
        alerts.push({
          id: 'hip_sag',
          name: 'Hip Sag Alert',
          message: 'Hips are dropping: Squeeze glutes and core to keep body straight.',
          level: 'warning',
          currentValue: Math.round(trunkDeviation),
          thresholdValue: 12,
          timestampMs,
        });
        this.stateMachine.recordFault('hip_sag');
        this.faultCounts.hip_sag++;
      } else if (hip.y < expectedHipY - 0.04) {
        // Hip pike
        alerts.push({
          id: 'hip_pike',
          name: 'Hip Pike Alert',
          message: 'Hips are piking upward: Lower hips into a straight plank line.',
          level: 'warning',
          currentValue: Math.round(trunkDeviation),
          thresholdValue: 12,
          timestampMs,
        });
        this.stateMachine.recordFault('hip_pike');
        this.faultCounts.hip_pike++;
      }
    }

    this.stateMachine.update(elbowAngle, timestampMs);

    let formScore = 100;
    if (trunkDeviation > 12) formScore -= Math.min(40, (trunkDeviation - 12) * 2.5);

    return {
      timestampMs,
      angles: {
        elbowAngle,
        trunkDeviation: Math.round(trunkDeviation),
      },
      distances: {},
      primaryMetric: elbowAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isLockout: elbowAngle >= 165,
        isChestAtDepth: elbowAngle <= 90,
        trunkAligned: trunkDeviation <= 12,
      },
      formScore: Math.max(0, Math.round(formScore)),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { hip_sag: 0, hip_pike: 0, shallow_depth: 0 };
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
