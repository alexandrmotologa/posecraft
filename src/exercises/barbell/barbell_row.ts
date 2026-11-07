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
import { RepetitionStateMachine } from '../../engine/state_machine';

export class BarbellRowRule implements ExerciseRule {
  public id = 'barbell_row';
  public name = 'Bent-Over Barbell Row';
  public category = 'barbell' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Elbow Row Angle';
  public primaryMetricUnit = '°';
  public description = 'Torso angle stability (15°–45°), elbow drive past ribs, and momentum cheat detection.';
  public instructions = [
    'Position camera at side profile at waist level.',
    'Hinge at hips until torso is between 15 and 45 degrees from horizontal.',
    'Pull elbows up and back past your ribcage without standing up.',
    'Lower bar under control without rocking your upper body.',
  ];

  private stateMachine: RepetitionStateMachine;
  private baselineTorsoAngle: number | null = null;
  private faultCounts: Record<string, number> = {
    torso_momentum: 0,
    shallow_row: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 160, // arms hanging down
      inflectionThreshold: 130,
      peakRomThreshold: 75, // elbows pulled past ribs
      isDescendingPhase: true,
      minRepDurationMs: 400,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_HIP] && lm[LandmarkIndex.LEFT_SHOULDER]) {
      this.baselineTorsoAngle = calculateHorizontalAngle(
        lm[LandmarkIndex.LEFT_HIP],
        lm[LandmarkIndex.LEFT_SHOULDER]
      );
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Elbow angle
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

    // Torso angle relative to floor
    const torsoAngle = calculateHorizontalAngle(
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_SHOULDER]
    );

    if (this.baselineTorsoAngle === null) {
      this.baselineTorsoAngle = torsoAngle;
    }

    const torsoDrift = Math.abs(torsoAngle - this.baselineTorsoAngle);

    // If athlete uses momentum by jerking torso upward > 18 degrees during pull
    if (this.stateMachine.getState() === 'CONCENTRIC' && torsoDrift > 18) {
      alerts.push({
        id: 'torso_momentum',
        name: 'Momentum Cheat Detected',
        message: 'Torso standing up: Maintain strict hip hinge and avoid body heaving.',
        level: 'warning',
        currentValue: Math.round(torsoDrift),
        thresholdValue: 15,
        timestampMs,
      });
      this.stateMachine.recordFault('torso_momentum');
      this.faultCounts.torso_momentum++;
    }

    this.stateMachine.update(elbowAngle, timestampMs);

    let formScore = 100;
    if (torsoDrift > 15) formScore -= 25;

    return {
      timestampMs,
      angles: {
        elbowAngle,
        torsoAngle: Math.round(torsoAngle),
        torsoDrift: Math.round(torsoDrift),
      },
      distances: {},
      primaryMetric: elbowAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isRowContracted: elbowAngle <= 75,
        isStrictHinge: torsoDrift <= 15,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.baselineTorsoAngle = null;
    this.faultCounts = { torso_momentum: 0, shallow_row: 0 };
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
