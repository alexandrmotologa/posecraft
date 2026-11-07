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
import { calculateCollinearityDeviation } from '../../engine/geometry';
import { IsometricStateMachine } from '../../engine/state_machine';

export class PlankRule implements ExerciseRule {
  public id = 'plank';
  public name = 'Isometric Plank';
  public category = 'calisthenics' as const;
  public cameraPerspective = 'side_profile' as const;
  public primaryMetricLabel = 'Hold Duration';
  public primaryMetricUnit = 's';
  public description = 'Smart Timer: seconds count strictly while collinearity is maintained (180° ± 8°).';
  public instructions = [
    'Position camera at side profile at floor level.',
    'Hold forearm or high plank with straight spine from heels to shoulders.',
    'The smart timer runs only while your hips remain aligned.',
    'If your hips sag or pike, the timer automatically pauses.',
  ];

  private stateMachine: IsometricStateMachine;
  private totalFaults: number = 0;

  constructor() {
    this.stateMachine = new IsometricStateMachine();
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Collinearity across ankle -> hip -> shoulder
    const ankle = lm[LandmarkIndex.LEFT_ANKLE];
    const hip = lm[LandmarkIndex.LEFT_HIP];
    const shoulder = lm[LandmarkIndex.LEFT_SHOULDER];

    const trunkDeviation = calculateCollinearityDeviation(ankle, hip, shoulder);
    const isValidForm = trunkDeviation <= 10;

    const { activeSeconds, isHolding } = this.stateMachine.update(isValidForm, timestampMs);

    if (!isValidForm) {
      this.totalFaults++;
      const expectedHipY = (shoulder.y + ankle.y) / 2;
      const isSag = hip.y > expectedHipY;

      alerts.push({
        id: isSag ? 'hip_sag' : 'hip_pike',
        name: isSag ? 'Hip Sag' : 'Hip Pike',
        message: isSag
          ? 'Hips sagging: Timer paused! Squeeze core and glutes.'
          : 'Hips piking: Timer paused! Lower hips into neutral line.',
        level: 'danger',
        currentValue: Math.round(trunkDeviation),
        thresholdValue: 10,
        timestampMs,
      });
    }

    const formScore = isValidForm ? 100 : Math.max(0, Math.round(100 - trunkDeviation * 4));

    return {
      timestampMs,
      angles: {
        collinearityDeviation: Math.round(trunkDeviation),
      },
      distances: {},
      primaryMetric: activeSeconds,
      repState: isHolding ? 'PEAK' : 'ARMED',
      repCount: activeSeconds,
      activeAlerts: alerts,
      telemetry: {
        isHolding,
        activeSeconds,
        trunkDeviation: Math.round(trunkDeviation),
      },
      formScore,
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.totalFaults = 0;
  }

  public getSummary(): ExerciseSummary {
    const activeSec = this.stateMachine.getActiveSeconds();
    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps: activeSec,
      validReps: activeSec,
      averageRom: 100,
      averageFormScore: this.totalFaults > 0 ? 80 : 100,
      averageConcentricMs: 0,
      averageEccentricMs: 0,
      totalDurationMs: this.stateMachine.getActiveMs(),
      faultCounts: {
        form_breaks: this.totalFaults,
      },
    };
  }
}
