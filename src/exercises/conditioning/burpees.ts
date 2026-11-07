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
import { calculateAngle2D, midpoint2D } from '../../engine/geometry';
import { RepetitionStateMachine } from '../../engine/state_machine';

export class BurpeesRule implements ExerciseRule {
  public id = 'burpees';
  public name = 'Burpees (Chest to Deck & Jump)';
  public category = 'conditioning' as const;
  public cameraPerspective = 'any' as const;
  public primaryMetricLabel = 'Chest Floor Proximity';
  public primaryMetricUnit = '%';
  public description = 'Chest contact to floor, vertical jump apex, and hands overhead extension.';
  public instructions = [
    'Position camera 3 meters away at 45 degrees to capture floor and jump overhead.',
    'Drop hands to floor, kick feet back, and touch chest and thighs to deck.',
    'Jump feet back in, jump vertically off floor, and clap hands overhead.',
    'Extend hips fully at the jump apex.',
  ];

  private stateMachine: RepetitionStateMachine;
  private floorY: number | null = null;
  private faultCounts: Record<string, number> = {
    incomplete_chest_touch: 0,
    no_jump_extension: 0,
  };

  constructor() {
    this.stateMachine = new RepetitionStateMachine({
      startThreshold: 20, // standing upright
      inflectionThreshold: 50, // dropping to floor
      peakRomThreshold: 85, // chest on deck
      isDescendingPhase: false, // floor proximity percentage INCREASES
      minRepDurationMs: 800,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    const baseline = calculateUserBaseline(skeleton);
    const lm = skeleton.landmarks;
    if (lm && lm[LandmarkIndex.LEFT_ANKLE]) {
      this.floorY = Math.max(lm[LandmarkIndex.LEFT_ANKLE].y, lm[LandmarkIndex.RIGHT_ANKLE].y);
    }
    return baseline;
  }

  public evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Chest center
    const midChest = midpoint2D(lm[LandmarkIndex.LEFT_SHOULDER], lm[LandmarkIndex.RIGHT_SHOULDER]);
    const currentFloorY = this.floorY ?? (lm[LandmarkIndex.LEFT_ANKLE].y + 0.05);

    // Proximity to floor: 0% when standing, 100% when chest touches floor
    const chestDistanceToFloor = Math.max(0, currentFloorY - midChest.y);
    const standingChestDist = baseline.standingHeight * 0.7;
    const floorProximityPct = Math.min(100, Math.max(0, Math.round((1 - chestDistanceToFloor / standingChestDist) * 100)));

    // Hands overhead detection: wrists above nose (wrists Y < nose Y)
    const midWrist = midpoint2D(lm[LandmarkIndex.LEFT_WRIST], lm[LandmarkIndex.RIGHT_WRIST]);
    const nose = lm[LandmarkIndex.NOSE];
    const isHandsOverhead = midWrist.y < nose.y;

    // Hip angle
    const hipAngle = calculateAngle2D(
      lm[LandmarkIndex.LEFT_SHOULDER],
      lm[LandmarkIndex.LEFT_HIP],
      lm[LandmarkIndex.LEFT_KNEE]
    );

    this.stateMachine.update(floorProximityPct, timestampMs);

    let formScore = 100;
    if (this.stateMachine.getState() === 'PEAK' && floorProximityPct < 80) {
      alerts.push({
        id: 'chest_touch',
        name: 'Incomplete Chest Touch',
        message: 'Chest must make contact with floor.',
        level: 'warning',
        timestampMs,
      });
      formScore -= 20;
    }

    return {
      timestampMs,
      angles: {
        hipAngle: Math.round(hipAngle),
      },
      distances: {
        floorProximityPercent: floorProximityPct,
      },
      primaryMetric: floorProximityPct,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      activeAlerts: alerts,
      telemetry: {
        isChestOnDeck: floorProximityPct >= 85,
        handsOverhead: isHandsOverhead,
      },
      formScore: Math.max(0, formScore),
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.floorY = null;
    this.faultCounts = { incomplete_chest_touch: 0, no_jump_extension: 0 };
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
