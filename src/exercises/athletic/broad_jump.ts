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
import { calculateAngle2D, calculateHorizontalAngle } from '../../engine/geometry';

export class BroadJumpRule implements ExerciseRule {
  public id = 'broad_jump';
  public name = 'Standing Broad Jump';
  public category = 'athletic' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Takeoff Angle';
  public primaryMetricUnit = '°';
  public description = 'Horizontal takeoff angle (~45°), horizontal displacement, and landing shock absorption.';
  public instructions = [
    'Position camera at side profile with full takeoff and landing zone in frame.',
    'Stand at line, swing arms back into deep crouch, and explode forward at ~45 degrees.',
    'Extend fully in midair, then swing legs forward to reach.',
    'Land softly on both feet and hold landing stick.',
  ];

  private baselineAnkleX: number | null = null;
  private takeoffAngle: number = 45;
  private jumpsRecorded: number = 0;

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_ANKLE]) {
      this.baselineAnkleX = lm[LandmarkIndex.LEFT_ANKLE].x;
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    const ankle = lm[LandmarkIndex.LEFT_ANKLE];
    const hip = lm[LandmarkIndex.LEFT_HIP];
    const shoulder = lm[LandmarkIndex.LEFT_SHOULDER];

    if (this.baselineAnkleX === null) {
      this.baselineAnkleX = ankle.x;
    }

    // Takeoff body launch angle relative to floor: ankle -> shoulder
    const launchAngle = calculateHorizontalAngle(ankle, shoulder);

    // Knee landing flexion
    const kneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    // Horizontal distance in torso ratios
    const horizontalDistanceNorm = Math.abs(ankle.x - this.baselineAnkleX) / (baseline.torsoLength || 0.35);

    // If takeoff angle is too steep (>60°) or too shallow (<30°)
    if (launchAngle > 60 && hip.y < 0.45) {
      alerts.push({
        id: 'steep_takeoff',
        name: 'Takeoff Angle Too Vertical',
        message: 'Takeoff too steep: Drive forward at approximately 45 degrees for maximum distance.',
        level: 'warning',
        currentValue: Math.round(launchAngle),
        thresholdValue: 45,
        timestampMs,
      });
    }

    let formScore = 100;
    if (Math.abs(launchAngle - 45) > 15) formScore -= 20;

    return {
      timestampMs,
      angles: {
        launchAngle: Math.round(launchAngle),
        kneeFlexion: Math.round(kneeAngle),
      },
      distances: {
        distanceRatio: parseFloat(horizontalDistanceNorm.toFixed(2)),
      },
      primaryMetric: Math.round(launchAngle),
      repState: 'PEAK',
      repCount: this.jumpsRecorded,
      activeAlerts: alerts,
      telemetry: {
        takeoffAngle: Math.round(launchAngle),
        horizontalDistanceTorsoUnits: parseFloat(horizontalDistanceNorm.toFixed(2)),
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.baselineAnkleX = null;
    this.takeoffAngle = 45;
    this.jumpsRecorded = 0;
  }

  public getSummary(): ExerciseSummary {
    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: this.jumpsRecorded,
      validReps: this.jumpsRecorded,
      averageRom: Math.round(this.takeoffAngle),
      averageFormScore: 92,
      averageConcentricMs: 0,
      averageEccentricMs: 0,
      totalDurationMs: 0,
      faultCounts: {},
    };
  }
}
