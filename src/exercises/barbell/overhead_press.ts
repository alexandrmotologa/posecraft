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

export class OverheadPressRule implements ExerciseRule {
  public id = 'overhead_press';
  public name = 'Overhead Press (OHP)';
  public category = 'barbell' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Overhead Lockout';
  public primaryMetricUnit = '°';
  public description = 'Elbow lockout at 180°, vertical bar trajectory, and lumbar hyperextension warning.';
  public instructions = [
    'Place camera at side profile to observe spine alignment and bar trajectory.',
    'Start with bar resting on anterior deltoids.',
    'Press vertically overhead, pulling head back slightly to clear the bar.',
    'Lock out directly above shoulders without overarching your lower back.',
  ];

  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {
    lumbar_arch: 0,
    incomplete_lockout: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 75, // racked at shoulders
      inflectionThreshold: 110,
      peakRomThreshold: 172, // full overhead lockout
      isDescendingPhase: false, // angle INCREASES as you press overhead
      minRepDurationMs: 400,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Overhead elbow extension
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

    // Torso angle relative to vertical: shoulder-to-hip
    const torsoLean = calculateVerticalAngle(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER]
    );

    // If athlete leans back more than 16 degrees during overhead drive
    if (torsoLean > 16) {
      alerts.push({
        id: 'lumbar_arch',
        name: 'Lumbar Hyperextension',
        message: 'Excessive back arching: Squeeze glutes and abs to keep torso vertical.',
        level: 'warning',
        currentValue: Math.round(torsoLean),
        thresholdValue: 14,
        timestampMs,
      });
      this.stateMachine.recordFault('lumbar_arch');
      this.faultCounts.lumbar_arch++;
    }

    this.stateMachine.update(elbowAngle, timestampMs);

    let formScore = 100;
    if (torsoLean > 14) formScore -= Math.min(35, (torsoLean - 14) * 3);

    return {
      timestampMs,
      angles: {
        elbowAngle,
        torsoLean: Math.round(torsoLean),
      },
      distances: {},
      primaryMetric: elbowAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isOverheadLockout: elbowAngle >= 172,
        isTorsoVertical: torsoLean <= 14,
      },
      formScore: Math.max(0, Math.round(formScore)),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = { lumbar_arch: 0, incomplete_lockout: 0 };
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
