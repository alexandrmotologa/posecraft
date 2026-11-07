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

export class WalkingLungesRule implements ExerciseRule {
  public id = 'walking_lunges';
  public name = 'Walking & Reverse Lunges';
  public category = 'unilateral' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Front Knee Angle';
  public primaryMetricUnit = '°';
  public description = '90° front and rear knee angles, vertical torso tracking, and knee tracking.';
  public instructions = [
    'Position camera at side profile to observe knee angles and stride length.',
    'Step out and lower hips vertically until front thigh is parallel to the ground.',
    'Back knee should approach 90 degrees with a few inches of floor clearance.',
    'Keep chest proud and drive back up through front heel.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    torso_lean: 0,
    shallow_lunge: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 165, // standing
      inflectionThreshold: 135,
      peakRomThreshold: 92, // 90 degree front knee
      isDescendingPhase: true,
      minRepDurationMs: 450,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Front knee angle (assume left leg leading or closer to camera)
    const leftKnee = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );
    const rightKnee = calculateAngle2D(
      lm[LandmarkIndex.RIGHT_HIP],
      lm[LandmarkIndex.RIGHT_KNEE],
      lm[LandmarkIndex.RIGHT_ANKLE]
    );

    // Primary front knee is the more flexed knee
    const frontKnee = Math.min(leftKnee, rightKnee);
    const backKnee = Math.max(leftKnee, rightKnee);

    // Torso vertical alignment
    const torsoLean = calculateVerticalAngle(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER]
    );

    if (torsoLean > 18 && frontKnee < 110) {
      alerts.push({
        id: 'torso_lean',
        name: 'Forward Torso Collapse',
        message: 'Keep torso upright: Do not collapse forward over front quad.',
        level: 'warning',
        currentValue: Math.round(torsoLean),
        thresholdValue: 15,
        timestampMs,
      });
      this.stateMachine.recordFault('torso_lean');
      this.faultCounts.torso_lean++;
    }

    this.stateMachine.update(Math.round(frontKnee), timestampMs);

    let formScore = 100;
    if (torsoLean > 15) formScore -= 20;

    return {
      timestampMs,
      angles: {
        frontKnee: Math.round(frontKnee),
        backKnee: Math.round(backKnee),
        torsoLean: Math.round(torsoLean),
      },
      distances: {},
      primaryMetric: Math.round(frontKnee),
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        is90DegreeDepth: frontKnee <= 92,
        isTorsoUpright: torsoLean <= 15,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { torso_lean: 0, shallow_lunge: 0 };
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
