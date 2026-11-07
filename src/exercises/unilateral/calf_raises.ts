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

export class CalfRaisesRule implements ExerciseRule {
  public id = 'calf_raises';
  public name = 'Standing Calf Raises';
  public category = 'unilateral' as const;
  public cameraPerspective = 'any' as const;
  public primaryMetricLabel = 'Heel Elevation';
  public primaryMetricUnit = 'cm';
  public description = 'Plantarflexion elevation with isometric top pause and knee bounce cheating prevention.';
  public instructions = [
    'Stand facing or side-profile to camera on flat floor or step.',
    'Drive up high on the balls of your feet.',
    'Hold the peak isometric contraction at the top for 1 full second.',
    'Keep knees straight; do not bend knees to bounce out of the bottom.',
  ];

  private stateMachine: RepetitionStateMachine;
  private baselineHeelY: number | null = null;
  private faultCounts: Record<string, number> = {
    knee_bounce: 0,
    rushed_pause: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 2, // flat foot on floor (cm)
      inflectionThreshold: 5,
      peakRomThreshold: 9, // full tip-toe elevation
      isDescendingPhase: false, // elevation INCREASES
      minRepDurationMs: 800, // enforces pause time
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_HEEL]) {
      this.baselineHeelY = lm[LandmarkIndex.LEFT_HEEL].y;
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Heel elevation in normalized screen units, scaled to cm
    const heelY = lm[LandmarkIndex.LEFT_HEEL].y;
    if (this.baselineHeelY === null) {
      this.baselineHeelY = heelY;
    }

    // In screen coordinates, higher heel elevation has lower y value
    const rawElevationNorm = Math.max(0, this.baselineHeelY - heelY) / (baseline.torsoLength || 0.35);
    const elevationCm = Math.round(rawElevationNorm * 50); // ~50cm torso scale factor

    // Knee angle to verify knees stay straight
    const kneeAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    // If knee bends more than 20 degrees (kneeAngle < 160)
    if (kneeAngle < 160) {
      alerts.push({
        id: 'knee_bounce',
        name: 'Knee Bounce Cheat',
        message: 'Keep knees straight: Isolate gastrocnemius without leg bouncing.',
        level: 'warning',
        currentValue: Math.round(kneeAngle),
        thresholdValue: 165,
        timestampMs,
      });
      this.stateMachine.recordFault('knee_bounce');
      this.faultCounts.knee_bounce++;
    }

    this.stateMachine.update(elevationCm, timestampMs);

    let formScore = 100;
    if (kneeAngle < 160) formScore -= 25;

    return {
      timestampMs,
      angles: {
        kneeAngle: Math.round(kneeAngle),
      },
      distances: {
        elevationCm,
      },
      primaryMetric: elevationCm,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isTopElevation: elevationCm >= 8,
        kneesLocked: kneeAngle >= 165,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.baselineHeelY = null;
    this.faultCounts = { knee_bounce: 0, rushed_pause: 0 };
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
