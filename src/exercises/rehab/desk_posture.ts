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
import { calculateCraniovertebralAngle, midpoint2D } from '../../engine/geometry';

export class DeskPostureRule implements ExerciseRule {
  public id = 'desk_posture';
  public name = 'Desk Posture Sentinel (Tech Neck CVA)';
  public category = 'rehab' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Craniovertebral Angle';
  public primaryMetricUnit = '°';
  public description = 'Craniovertebral angle (CVA) tracking forward head posture with slouch duration alerts.';
  public instructions = [
    'Position laptop or webcam at side profile capturing head and upper spine.',
    'Sit naturally as you work at your desk.',
    'Engine continuously measures the Craniovertebral Angle (CVA) between ear and neck base.',
    'Alert sounds if forward head slouch persists past threshold.',
  ];

  private slouchDurationMs: number = 0;
  private lastTimestampMs: number = 0;
  private totalSlouchEpisodes: number = 0;

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    if (this.lastTimestampMs === 0) this.lastTimestampMs = timestampMs;
    const deltaMs = Math.min(1000, Math.max(0, timestampMs - this.lastTimestampMs));
    this.lastTimestampMs = timestampMs;

    const ear = lm[LandmarkIndex.LEFT_EAR];
    const shoulder = lm[LandmarkIndex.LEFT_SHOULDER];

    // Approximate C7 neck base point
    const c7 = midpoint2D(shoulder, { x: shoulder.x, y: shoulder.y - 0.05 });

    const cvaAngle = calculateCraniovertebralAngle(ear, c7);

    // Normal CVA: 50-55°. Forward head posture: < 48°
    const isSlouching = cvaAngle < 48;

    if (isSlouching) {
      this.slouchDurationMs += deltaMs;
    } else {
      this.slouchDurationMs = Math.max(0, this.slouchDurationMs - deltaMs * 2);
    }

    const slouchSec = Math.floor(this.slouchDurationMs / 1000);

    if (this.slouchDurationMs >= 10000) {
      // 10+ seconds slouch
      this.totalSlouchEpisodes++;
      alerts.push({
        id: 'tech_neck_slouch',
        name: 'Forward Head Posture Alert',
        message: 'Prolonged forward head posture: Retract chin, lift crown, and relax shoulders.',
        level: 'danger',
        currentValue: Math.round(cvaAngle),
        thresholdValue: 50,
        timestampMs,
      });
    } else if (isSlouching) {
      alerts.push({
        id: 'mild_slouch',
        name: 'Head Slouching',
        message: 'Head drifting forward toward screen.',
        level: 'warning',
        currentValue: Math.round(cvaAngle),
        thresholdValue: 50,
        timestampMs,
      });
    }

    let formScore = 100;
    if (cvaAngle < 48) formScore -= Math.min(50, (48 - cvaAngle) * 3);

    return {
      timestampMs,
      angles: {
        craniovertebralAngle: Math.round(cvaAngle),
      },
      distances: {
        slouchDurationSeconds: slouchSec,
      },
      primaryMetric: Math.round(cvaAngle),
      repState: isSlouching ? 'ARMED' : 'PEAK',
      repCount: slouchSec,
      activeAlerts: alerts,
      telemetry: {
        isSlouching,
        slouchDurationSeconds: slouchSec,
        postureStatus: cvaAngle >= 50 ? 'Optimal' : cvaAngle >= 45 ? 'Mild Tech Neck' : 'Severe Slouch',
      },
      formScore: Math.max(0, Math.round(formScore)),
    };
  }

  public reset(): void {
    this.slouchDurationMs = 0;
    this.lastTimestampMs = 0;
    this.totalSlouchEpisodes = 0;
  }

  public getSummary(): ExerciseSummary {
    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: Math.floor(this.slouchDurationMs / 1000),
      validReps: Math.floor(this.slouchDurationMs / 1000),
      averageRom: 52,
      averageFormScore: this.totalSlouchEpisodes > 0 ? 70 : 96,
      averageConcentricMs: 0,
      averageEccentricMs: 0,
      totalDurationMs: this.slouchDurationMs,
      faultCounts: {
        prolonged_slouch_episodes: this.totalSlouchEpisodes,
      },
    };
  }
}
