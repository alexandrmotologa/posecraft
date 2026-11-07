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
import { IsometricStateMachine } from '../../engine/state_machine';

export class HandstandRule implements ExerciseRule {
  public id = 'handstand';
  public name = 'Handstand Hold';
  public category = 'calisthenics' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Vertical Alignment';
  public primaryMetricUnit = '°';
  public description = 'Vertical alignment vector across wrist-shoulder-hip-ankle (180° ± 6°).';
  public instructions = [
    'Position camera at side profile with full body view.',
    'Kick up and balance with straight elbows and shoulders open.',
    'Align wrist, shoulder, pelvis, and toes in a single vertical column.',
    'Avoid banana back lumbar arching.',
  ];

  private stateMachine: IsometricStateMachine;
  private archFaults: number = 0;

  constructor() {
    this.stateMachine = new IsometricStateMachine();
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Alignment: shoulder -> hip -> ankle
    const trunkAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    // Shoulder angle: wrist -> shoulder -> hip
    const shoulderAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_WRIST],
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP]
    );

    // Vertical line of entire body
    const bodyVertical = calculateVerticalAngle(
      lm[LandmarkIndex.LEFT_WRIST],
      lm[LandmarkIndex.LEFT_ANKLE]
    );

    const isSpineStraight = Math.abs(180 - trunkAngle) <= 8;
    const isShoulderOpen = shoulderAngle >= 168;
    const isVertical = bodyVertical <= 8;
    const isValidHold = isSpineStraight && isShoulderOpen && isVertical;

    const { activeSeconds, isHolding } = this.stateMachine.update(isValidHold, timestampMs);

    if (Math.abs(180 - trunkAngle) > 12) {
      this.archFaults++;
      alerts.push({
        id: 'banana_back',
        name: 'Lumbar Hyperextension',
        message: 'Banana back arching: Engage anterior core and tuck pelvis into posterior tilt.',
        level: 'warning',
        currentValue: Math.round(Math.abs(180 - trunkAngle)),
        thresholdValue: 8,
        timestampMs,
      });
    }

    if (shoulderAngle < 165) {
      alerts.push({
        id: 'closed_shoulders',
        name: 'Closed Shoulders',
        message: 'Open shoulder angle: Push active floor through wrists.',
        level: 'warning',
        currentValue: Math.round(shoulderAngle),
        thresholdValue: 170,
        timestampMs,
      });
    }

    let formScore = 100;
    if (!isSpineStraight) formScore -= 20;
    if (!isShoulderOpen) formScore -= 15;
    if (!isVertical) formScore -= 15;

    return {
      timestampMs,
      angles: {
        trunkAlignment: Math.round(trunkAngle),
        shoulderAngle: Math.round(shoulderAngle),
        bodyVerticalDeviation: Math.round(bodyVertical),
      },
      distances: {},
      primaryMetric: Math.round(trunkAngle),
      repState: isHolding ? 'PEAK' : 'ARMED',
      repCount: activeSeconds,
      activeAlerts: alerts,
      telemetry: {
        isHolding,
        holdSeconds: activeSeconds,
        straightSpine: isSpineStraight,
        openShoulders: isShoulderOpen,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.archFaults = 0;
  }

  public getSummary(): ExerciseSummary {
    const activeSec = this.stateMachine.getActiveSeconds();
    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: activeSec,
      validReps: activeSec,
      averageRom: 180,
      averageFormScore: this.archFaults > 0 ? 80 : 100,
      averageConcentricMs: 0,
      averageEccentricMs: 0,
      totalDurationMs: this.stateMachine.getActiveMs(),
      faultCounts: {
        banana_back_arches: this.archFaults,
      },
    };
  }
}
