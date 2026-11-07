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
import { distance2D } from '../../engine/geometry';

export class ShoulderMobilityRule implements ExerciseRule {
  public id = 'shoulder_mobility';
  public name = 'Shoulder Mobility (Apley Scratch Test)';
  public category = 'rehab' as const;
  public cameraPerspective = 'any' as const;
  public primaryMetricLabel = 'Fist Reach Gap';
  public primaryMetricUnit = 'cm';
  public description = 'Clinical Apley scratch test measuring reach gap behind spine normalized by hand length.';
  public instructions = [
    'Stand facing away from camera so back is clearly visible.',
    'Reach one hand over shoulder and opposite hand under behind your spine.',
    'Bring both fists as close together along the spine as possible.',
    'Hold peak reach position for 2 seconds to grade mobility score.',
  ];

  private minGapCm: number = 999;
  private mobilityScore: number = 3;

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    const leftWrist = lm[LandmarkIndex.LEFT_WRIST];
    const rightWrist = lm[LandmarkIndex.RIGHT_WRIST];

    // Distance between fists in normalized torso units
    const gapNorm = distance2D(leftWrist, rightWrist) / (baseline.torsoLength || 0.35);
    const gapCm = Math.round(gapNorm * 50);

    if (gapCm < this.minGapCm) {
      this.minGapCm = gapCm;
    }

    // Clinical standard: estimated hand length is ~18cm
    // Score 3: gap <= 18cm (1 hand length)
    // Score 2: gap <= 27cm (1.5 hand lengths)
    // Score 1: gap > 27cm
    let currentScore = 1;
    if (gapCm <= 18) currentScore = 3;
    else if (gapCm <= 27) currentScore = 2;
    this.mobilityScore = currentScore;

    if (gapCm > 32) {
      alerts.push({
        id: 'shoulder_tightness',
        name: 'Shoulder Internal/External Restriction',
        message: 'Significant reach gap: Rotator cuff and thoracic restriction.',
        level: 'warning',
        currentValue: gapCm,
        thresholdValue: 27,
        timestampMs,
      });
    }

    return {
      timestampMs,
      angles: {},
      distances: {
        fistGapCm: gapCm,
        minimumGapCm: this.minGapCm === 999 ? gapCm : this.minGapCm,
      },
      primaryMetric: gapCm,
      repState: 'PEAK',
      repCount: 1,
      activeAlerts: alerts,
      telemetry: {
        gapCm,
        clinicalGrade: `Score ${this.mobilityScore} / 3`,
        tier: this.mobilityScore === 3 ? 'Excellent (Tier 1)' : this.mobilityScore === 2 ? 'Adequate (Tier 2)' : 'Restricted (Tier 3)',
      },
      formScore: this.mobilityScore === 3 ? 100 : this.mobilityScore === 2 ? 75 : 50,
    };
  }

  public reset(): void {
    this.minGapCm = 999;
    this.mobilityScore = 3;
  }

  public getSummary(): ExerciseSummary {
    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: 1,
      validReps: 1,
      averageRom: this.minGapCm === 999 ? 0 : this.minGapCm,
      averageFormScore: this.mobilityScore * 33,
      averageConcentricMs: 0,
      averageEccentricMs: 0,
      totalDurationMs: 0,
      faultCounts: {},
    };
  }
}
