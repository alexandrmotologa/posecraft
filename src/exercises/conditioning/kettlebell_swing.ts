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
import { RepetitionStateMachine } from '../../engine/state_machine';

export class KettlebellSwingRule implements ExerciseRule {
  public id = 'kettlebell_swing';
  public name = 'Kettlebell Swings (Hip Hinge)';
  public category = 'conditioning' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Hip Hinge Angle';
  public primaryMetricUnit = '°';
  public description = 'Classifier distinguishing explosive hip hinge from squatty swing, with lockout detection.';
  public instructions = [
    'Place camera at side profile at hip height.',
    'Hinge deeply at the hips, sending pelvis back with soft knees.',
    'Snap hips forward with glutes to propel the bell weightlessly to chest level.',
    'Avoid dropping into a squat; this is a posterior chain hinge, not a squat.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    squatty_swing: 0,
    lumbar_flexion: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 75, // back hinge
      inflectionThreshold: 110,
      peakRomThreshold: 172, // explosive hip lockout
      isDescendingPhase: false, // angle INCREASES as hips snap forward
      minRepDurationMs: 400,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Hip angle
    const hipAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE]
    );

    // Knee angle
    const kneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    // Hinge vs Squatty classifier:
    // At bottom of swing, a clean hinge has kneeAngle > 130° (soft knee) with deep hip flexion (hipAngle < 95°).
    // If kneeAngle drops below 115°, user is squatting the weight instead of hinging.
    const isSquatty = this.stateMachine.getState() === 'CONCENTRIC' && kneeAngle < 115;

    if (isSquatty) {
      alerts.push({
        id: 'squatty_swing',
        name: 'Squatty Swing Fault',
        message: 'Squat pattern detected: Push hips back with high shins for a true hip hinge.',
        level: 'warning',
        currentValue: Math.round(kneeAngle),
        thresholdValue: 125,
        timestampMs,
      });
      this.stateMachine.recordFault('squatty_swing');
      this.faultCounts.squatty_swing++;
    }

    this.stateMachine.update(Math.round(hipAngle), timestampMs);

    let formScore = 100;
    if (isSquatty) formScore -= 30;

    return {
      timestampMs,
      angles: {
        hipAngle: Math.round(hipAngle),
        kneeAngle: Math.round(kneeAngle),
      },
      distances: {},
      primaryMetric: Math.round(hipAngle),
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isHipHinge: kneeAngle >= 125,
        isLockout: hipAngle >= 170,
        patternClassification: kneeAngle >= 125 ? 'Clean Hip Hinge' : 'Squatty Fault',
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { squatty_swing: 0, lumbar_flexion: 0 };
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
