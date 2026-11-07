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
import { calculateAngle2D, calculateNormalizedClearance, calculateVerticalAngle, midpoint2D } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class PullUpsRule implements ExerciseRule {
  public id = 'pull_ups';
  public name = 'Pull-Ups & Chin-Ups';
  public category = 'calisthenics' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Elbow Angle';
  public primaryMetricUnit = '°';
  public description = 'Dead hang elbow lockout (>160°), chin clearing bar height, and kipping detection.';
  public instructions = [
    'Position the camera at side profile or 45 degrees to capture full body hang.',
    'Start in a complete dead hang with arms straight.',
    'Pull until your chin clearly passes above the bar height.',
    'Avoid swinging your legs or kipping with knees forward.',
  ];

  private stateMachine: RepetitionStateMachine;
  private barHeightY: number | null = null;
  private faultCounts: Record<string, number> = {
    kipping: 0,
    incomplete_deadhang: 0,
    shallow_chin: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 160, // dead hang lockout
      inflectionThreshold: 130, // upward pull initiated
      peakRomThreshold: 55, // elbow flexion when chin clears bar
      isDescendingPhase: true, // angle decreases as elbows flex
      minRepDurationMs: 400,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_WRIST] && lm[LandmarkIndex.RIGHT_WRIST]) {
      const midWrist = midpoint2D(lm[LandmarkIndex.LEFT_WRIST], lm[LandmarkIndex.RIGHT_WRIST]);
      this.barHeightY = midWrist.y;
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Left and right arm angles
    const leftElbowAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_ELBOW],
      lm[LandmarkIndex.LEFT_WRIST]
    );
    const rightElbowAngle = calculateAngle2D(
      lm[LandmarkIndex.RIGHT_SHOULDER],
      lm[LandmarkIndex.RIGHT_ELBOW],
      lm[LandmarkIndex.RIGHT_WRIST]
    );

    const primaryElbowAngle = Math.round((leftElbowAngle + rightElbowAngle) / 2);

    // Chin / nose clearance relative to wrist bar height
    const nose = lm[LandmarkIndex.NOSE];
    const midWrist = midpoint2D(lm[LandmarkIndex.LEFT_WRIST], lm[LandmarkIndex.RIGHT_WRIST]);
    const currentBarY = this.barHeightY ?? midWrist.y;
    const chinClearance = calculateNormalizedClearance(nose.y, currentBarY, baseline.torsoLength);

    // Kipping detection: check knee angle relative to vertical torso axis
    const leftThighKip = calculateVerticalAngle(lm[LandmarkIndex.LEFT_HIP], lm[LandmarkIndex.LEFT_KNEE]);
    const rightThighKip = calculateVerticalAngle(lm[LandmarkIndex.RIGHT_HIP], lm[LandmarkIndex.RIGHT_KNEE]);
    const avgKipAngle = (leftThighKip + rightThighKip) / 2;

    if (avgKipAngle > 22) {
      alerts.push({
        id: 'kipping_detected',
        name: 'Kipping Fault',
        message: 'Kipping detected: Keep legs straight and eliminate swinging momentum.',
        level: 'warning',
        currentValue: Math.round(avgKipAngle),
        thresholdValue: 20,
        timestampMs,
      });
      this.stateMachine.recordFault('kipping');
      this.faultCounts.kipping++;
    }

    if (this.stateMachine.getState() === 'CONCENTRIC' && primaryElbowAngle < 60 && chinClearance < 0.05) {
      alerts.push({
        id: 'shallow_chin',
        name: 'Incomplete Height',
        message: 'Chin did not clear bar height.',
        level: 'warning',
        currentValue: Math.round(chinClearance * 100),
        thresholdValue: 15,
        timestampMs,
      });
      this.stateMachine.recordFault('shallow_chin');
      this.faultCounts.shallow_chin++;
    }

    this.stateMachine.update(primaryElbowAngle, timestampMs);

    let formScore = 100;
    if (avgKipAngle > 20) formScore -= 25;
    if (chinClearance < 0.1 && primaryElbowAngle < 60) formScore -= 20;

    return {
      timestampMs,
      angles: {
        leftElbow: Math.round(leftElbowAngle),
        rightElbow: Math.round(rightElbowAngle),
        averageElbow: primaryElbowAngle,
        kipAngle: Math.round(avgKipAngle),
      },
      distances: {
        chinClearanceNormalized: parseFloat(chinClearance.toFixed(2)),
      },
      primaryMetric: primaryElbowAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        chinOverBar: chinClearance >= 0.1,
        isKipping: avgKipAngle > 20,
        deadHangLockout: primaryElbowAngle >= 160,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.barHeightY = null;
    this.faultCounts = { kipping: 0, incomplete_deadhang: 0, shallow_chin: 0 };
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
