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

export class VerticalJumpRule implements ExerciseRule {
  public id = 'vertical_jump';
  public name = 'Countermovement Vertical Jump (CMJ)';
  public category = 'athletic' as const;
  public cameraPerspective = 'any' as const;
  public primaryMetricLabel = 'Jump Height';
  public primaryMetricUnit = 'cm';
  public description = 'Airborne flight time jump height (h = 1/8 g * t_air^2) and triple extension grading.';
  public instructions = [
    'Position camera 3 meters away so full body and takeoff floor are in frame.',
    'Stand tall, quickly dip into countermovement crouch, and explode vertically.',
    'Achieve full triple extension through ankles, knees, and hips.',
    'Absorb landing softly with knees bent.',
  ];

  private baselineAnkleY: number | null = null;
  private takeoffTimestamp: number | null = null;
  private landingTimestamp: number | null = null;
  private isAirborne: boolean = false;
  private lastJumpHeightCm: number = 0;
  private jumpHistory: { heightCm: number; airtimeMs: number; tripleExtensionScore: number }[] = [];

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_ANKLE]) {
      this.baselineAnkleY = (lm[LandmarkIndex.LEFT_ANKLE].y + lm[LandmarkIndex.RIGHT_ANKLE].y) / 2;
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    const leftAnkleY = lm[LandmarkIndex.LEFT_ANKLE].y;
    const rightAnkleY = lm[LandmarkIndex.RIGHT_ANKLE].y;
    const currentAnkleY = (leftAnkleY + rightAnkleY) / 2;

    if (this.baselineAnkleY === null) {
      this.baselineAnkleY = currentAnkleY;
    }

    // Displacement above baseline floor
    const displacementNorm = (this.baselineAnkleY - currentAnkleY) / (baseline.torsoLength || 0.35);
    const isNowAirborne = displacementNorm > 0.08; // clear toe-off threshold

    // Triple extension angles
    const kneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );
    const hipAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE]
    );

    // State transition logic for flight duration
    if (!this.isAirborne && isNowAirborne) {
      // Takeoff moment
      this.isAirborne = true;
      this.takeoffTimestamp = timestampMs;
    } else if (this.isAirborne && !isNowAirborne) {
      // Landing moment
      this.isAirborne = false;
      this.landingTimestamp = timestampMs;

      if (this.takeoffTimestamp !== null) {
        const airtimeSeconds = Math.max(0.1, (this.landingTimestamp - this.takeoffTimestamp) / 1000);
        // Formula: h = (1/8) * 9.80665 * t_air^2 (meters) -> * 100 for cm
        const heightMeters = 0.125 * 9.80665 * Math.pow(airtimeSeconds, 2);
        this.lastJumpHeightCm = Math.min(130, Math.max(5, Math.round(heightMeters * 100)));

        const extensionScore = Math.min(100, Math.round((kneeAngle / 175) * 50 + (hipAngle / 175) * 50));
        this.jumpHistory.push({
          heightCm: this.lastJumpHeightCm,
          airtimeMs: Math.round(airtimeSeconds * 1000),
          tripleExtensionScore: extensionScore,
        });
      }
    }

    // Check stiff landing warning
    if (!this.isAirborne && displacementNorm <= 0.04 && kneeAngle > 165 && this.lastJumpHeightCm > 15) {
      alerts.push({
        id: 'stiff_landing',
        name: 'Stiff Landing Impact',
        message: 'Stiff landing: Flex knees to absorb floor shock safely.',
        level: 'warning',
        timestampMs,
      });
    }

    return {
      timestampMs,
      angles: {
        kneeExtension: Math.round(kneeAngle),
        hipExtension: Math.round(hipAngle),
      },
      distances: {
        jumpHeightCm: this.lastJumpHeightCm,
      },
      primaryMetric: this.lastJumpHeightCm,
      repState: this.isAirborne ? 'PEAK' : 'IDLE',
      repCount: this.jumpHistory.length,
      activeAlerts: alerts,
      telemetry: {
        isAirborne: this.isAirborne,
        lastJumpHeightCm: this.lastJumpHeightCm,
        lastJumpHeightInches: Math.round(this.lastJumpHeightCm / 2.54),
        totalJumps: this.jumpHistory.length,
      },
      formScore: this.isAirborne && kneeAngle >= 165 ? 100 : 90,
    };
  }

  public reset(): void {
    this.baselineAnkleY = null;
    this.takeoffTimestamp = null;
    this.landingTimestamp = null;
    this.isAirborne = false;
    this.lastJumpHeightCm = 0;
    this.jumpHistory = [];
  }

  public getSummary(): ExerciseSummary {
    const totalJumps = this.jumpHistory.length;
    const avgHeight = totalJumps > 0 ? this.jumpHistory.reduce((a, b) => a + b.heightCm, 0) / totalJumps : 0;
    const avgAirtime = totalJumps > 0 ? this.jumpHistory.reduce((a, b) => a + b.airtimeMs, 0) / totalJumps : 0;

    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: totalJumps,
      validReps: totalJumps,
      averageRom: Math.round(avgHeight),
      averageFormScore: totalJumps > 0 ? 95 : 100,
      averageConcentricMs: Math.round(avgAirtime),
      averageEccentricMs: 0,
      totalDurationMs: totalJumps * 2000,
      faultCounts: {},
    };
  }
}
