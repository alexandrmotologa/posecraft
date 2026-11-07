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
import { IsometricStateMachine } from '../../engine/state_machine';

export class LSitRule implements ExerciseRule {
  public id = 'l_sit';
  public name = 'L-Sit & Hanging Leg Raises';
  public category = 'calisthenics' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Hip Flexion Angle';
  public primaryMetricUnit = '°';
  public description = 'Hip flexion (<=90°), knee extension lockout (>=170°), and floor clearance.';
  public instructions = [
    'Place camera at side profile at parallette or dip bar height.',
    'Depress shoulders and lock elbows.',
    'Elevate legs to parallel (90 degrees at hips) or higher.',
    'Lock knees straight (at least 170 degrees) throughout hold.',
  ];

  private stateMachine: IsometricStateMachine;
  private kneeFaults: number = 0;

  constructor() {
    this.stateMachine = new IsometricStateMachine();
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Hip flexion: shoulder -> hip -> knee
    const hipAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE]
    );

    // Knee extension: hip -> knee -> ankle
    const kneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    const isHipValid = hipAngle <= 95;
    const isKneeStraight = kneeAngle >= 165;
    const isValidHold = isHipValid && isKneeStraight;

    const { activeSeconds, isHolding } = this.stateMachine.update(isValidHold, timestampMs);

    if (!isKneeStraight) {
      this.kneeFaults++;
      alerts.push({
        id: 'bent_knees',
        name: 'Knee Bend Fault',
        message: 'Knees are bent: Contract quadriceps to lock knees straight.',
        level: 'warning',
        currentValue: Math.round(kneeAngle),
        thresholdValue: 170,
        timestampMs,
      });
    }

    if (!isHipValid) {
      alerts.push({
        id: 'low_hips',
        name: 'Legs Dropping',
        message: 'Legs dropped below 90°: Lift feet up to parallel.',
        level: 'warning',
        currentValue: Math.round(hipAngle),
        thresholdValue: 90,
        timestampMs,
      });
    }

    let formScore = 100;
    if (!isKneeStraight) formScore -= 25;
    if (!isHipValid) formScore -= 30;

    return {
      timestampMs,
      angles: {
        hipFlexion: Math.round(hipAngle),
        kneeExtension: Math.round(kneeAngle),
      },
      distances: {},
      primaryMetric: Math.round(hipAngle),
      repState: isHolding ? 'PEAK' : 'ARMED',
      repCount: activeSeconds,
      activeAlerts: alerts,
      telemetry: {
        holdSeconds: activeSeconds,
        isHolding,
        kneeLockout: isKneeStraight,
        hipAt90: isHipValid,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.kneeFaults = 0;
  }

  public getSummary(): ExerciseSummary {
    const activeSec = this.stateMachine.getActiveSeconds();
    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: activeSec,
      validReps: activeSec,
      averageRom: 90,
      averageFormScore: this.kneeFaults > 0 ? 82 : 100,
      averageConcentricMs: 0,
      averageEccentricMs: 0,
      totalDurationMs: this.stateMachine.getActiveMs(),
      faultCounts: {
        knee_bends: this.kneeFaults,
      },
    };
  }
}
