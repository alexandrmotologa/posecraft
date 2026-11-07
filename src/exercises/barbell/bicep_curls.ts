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
import { calculateAngle2D, calculateVerticalAngle } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class BicepCurlsRule implements ExerciseRule {
  public id = 'bicep_curls';
  public name = 'Strict Bicep Curls';
  public category = 'barbell' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Elbow Flexion Angle';
  public primaryMetricUnit = '°';
  public description = 'Cheating Detector penalizing forward elbow drift (>8cm) and torso backward swing.';
  public instructions = [
    'Position camera at side profile to monitor elbow stationarity and torso posture.',
    'Pin elbows directly against your sides.',
    'Curl weights upward without swinging your lower back or drifting elbows forward.',
    'Lower all the way down to complete extension before starting next rep.',
  ];

  private stateMachine: RepetitionStateMachine;
  private baselineElbowX: number | null = null;
  private faultCounts: Record<string, number> = {
    elbow_drift: 0,
    torso_swing: 0,
    incomplete_extension: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 160, // full bottom extension
      inflectionThreshold: 130,
      peakRomThreshold: 50, // peak curl flexion
      isDescendingPhase: true,
      minRepDurationMs: 400,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_ELBOW]) {
      this.baselineElbowX = lm[LandmarkIndex.LEFT_ELBOW].x;
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Left and right elbow flexion
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

    // Torso backward swing
    const torsoLean = calculateVerticalAngle(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER]
    );

    // Forward elbow drift calculation (normalized against torso length)
    const currentElbowX = lm[LandmarkIndex.LEFT_ELBOW].x;
    if (this.baselineElbowX === null) {
      this.baselineElbowX = currentElbowX;
    }

    const elbowDriftNorm = Math.abs(currentElbowX - this.baselineElbowX) / (baseline.torsoLength || 0.35);

    // If elbow drifts forward more than 0.15 of torso (~6-8 cm) during concentric curl
    if (this.stateMachine.getState() === 'CONCENTRIC' && elbowDriftNorm > 0.16) {
      alerts.push({
        id: 'elbow_drift',
        name: 'Elbow Drift Cheat',
        message: 'Elbows drifting forward: Pin elbows to your ribs for strict bicep isolation.',
        level: 'warning',
        currentValue: Math.round(elbowDriftNorm * 100),
        thresholdValue: 15,
        timestampMs,
      });
      this.stateMachine.recordFault('elbow_drift');
      this.faultCounts.elbow_drift++;
    }

    // Torso swinging backward
    if (this.stateMachine.getState() === 'CONCENTRIC' && torsoLean > 14) {
      alerts.push({
        id: 'torso_swing',
        name: 'Torso Swing Cheat',
        message: 'Backward body swing detected: Eliminate momentum and curl strictly.',
        level: 'warning',
        currentValue: Math.round(torsoLean),
        thresholdValue: 12,
        timestampMs,
      });
      this.stateMachine.recordFault('torso_swing');
      this.faultCounts.torso_swing++;
    }

    this.stateMachine.update(elbowAngle, timestampMs);

    let formScore = 100;
    if (elbowDriftNorm > 0.15) formScore -= 20;
    if (torsoLean > 12) formScore -= 20;

    return {
      timestampMs,
      angles: {
        elbowAngle,
        torsoLean: Math.round(torsoLean),
      },
      distances: {
        elbowDriftPercent: Math.round(elbowDriftNorm * 100),
      },
      primaryMetric: elbowAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isStrict: elbowDriftNorm <= 0.15 && torsoLean <= 12,
        isFullExtension: elbowAngle >= 160,
        isPeakFlexion: elbowAngle <= 50,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.baselineElbowX = null;
    this.faultCounts = { elbow_drift: 0, torso_swing: 0, incomplete_extension: 0 };
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
