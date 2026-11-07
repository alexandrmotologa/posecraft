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

export class RunningGaitRule implements ExerciseRule {
  public id = 'running_gait';
  public name = 'Running Gait & Cadence Analysis';
  public category = 'athletic' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Step Cadence';
  public primaryMetricUnit = 'SPM';
  public description = 'Cadence tracking (SPM), foot strike ground angle, and overstriding detection.';
  public instructions = [
    'Place camera at side profile along treadmill or running lane at knee height.',
    'Run at regular training pace.',
    'Engine analyzes foot strike angle relative to hip center and step cadence (SPM).',
    'Aim for 170-180 SPM with foot landing underneath center of mass.',
  ];

  private stepTimestamps: number[] = [];
  private lastLeadLeg: 'left' | 'right' | null = null;
  private currentSpm: number = 0;
  private overstrideCount: number = 0;

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    const leftAnkle = lm[LandmarkIndex.LEFT_ANKLE];
    const rightAnkle = lm[LandmarkIndex.RIGHT_ANKLE];
    const hip = lm[LandmarkIndex.LEFT_HIP];

    // Identify which foot is leading forward horizontally
    const isLeftLead = leftAnkle.x < rightAnkle.x; // assuming running left-to-right
    const currentLead = isLeftLead ? 'left' : 'right';

    // Step cycle detection
    if (this.lastLeadLeg !== null && currentLead !== this.lastLeadLeg) {
      this.stepTimestamps.push(timestampMs);
      if (this.stepTimestamps.length > 20) this.stepTimestamps.shift();

      if (this.stepTimestamps.length >= 2) {
        const windowSec = (this.stepTimestamps[this.stepTimestamps.length - 1] - this.stepTimestamps[0]) / 1000;
        if (windowSec > 0) {
          this.currentSpm = Math.round(((this.stepTimestamps.length - 1) / windowSec) * 60);
        }
      }
    }
    this.lastLeadLeg = currentLead;

    // Overstriding check: distance between forward foot and hip center
    const forwardFoot = isLeftLead ? leftAnkle : rightAnkle;
    const horizontalLeadNorm = Math.abs(forwardFoot.x - hip.x) / (baseline.torsoLength || 0.35);

    // Knee angle at strike
    const leadKneeAngle = isLeftLead
      ? calculateAngle2D(lm[LandmarkIndex.LEFT_HIP], lm[LandmarkIndex.LEFT_KNEE], lm[LandmarkIndex.LEFT_ANKLE])
      : calculateAngle2D(lm[LandmarkIndex.RIGHT_HIP], lm[LandmarkIndex.RIGHT_KNEE], lm[LandmarkIndex.RIGHT_ANKLE]);

    // Overstride warning if foot reaches excessively far forward (>0.65 torso length) with straight knee (>165°)
    const isOverstriding = horizontalLeadNorm > 0.65 && leadKneeAngle > 165;
    if (isOverstriding) {
      this.overstrideCount++;
      alerts.push({
        id: 'overstriding',
        name: 'Overstriding Fault',
        message: 'Overstriding detected: Land with foot closer underneath your hips with soft knee.',
        level: 'warning',
        timestampMs,
      });
    }

    let formScore = 100;
    if (isOverstriding) formScore -= 25;
    if (this.currentSpm > 0 && this.currentSpm < 155) formScore -= 15; // low sluggish cadence

    return {
      timestampMs,
      angles: {
        kneeAngleAtStrike: Math.round(leadKneeAngle),
      },
      distances: {
        cadenceSpm: this.currentSpm,
        strideLeadRatio: parseFloat(horizontalLeadNorm.toFixed(2)),
      },
      primaryMetric: this.currentSpm,
      repState: 'CONCENTRIC',
      repCount: this.stepTimestamps.length,
      activeAlerts: alerts,
      telemetry: {
        cadenceSpm: this.currentSpm,
        overstridingFlag: isOverstriding,
        leadLeg: currentLead,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stepTimestamps = [];
    this.lastLeadLeg = null;
    this.currentSpm = 0;
    this.overstrideCount = 0;
  }

  public getSummary(): ExerciseSummary {
    const totalSteps = this.stepTimestamps.length;
    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: totalSteps,
      validReps: totalSteps,
      averageRom: this.currentSpm,
      averageFormScore: this.overstrideCount > 0 ? 82 : 98,
      averageConcentricMs: 0,
      averageEccentricMs: 0,
      totalDurationMs: totalSteps * 400,
      faultCounts: {
        overstriding: this.overstrideCount,
      },
    };
  }
}
