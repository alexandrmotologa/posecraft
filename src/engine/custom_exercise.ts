/**
 * Visual No-Code Custom Exercise Engine for PoseCraft.
 * Allows physical therapists, athletic trainers, and lifters to define, persist,
 * and execute custom kinematic exercise rules without writing code.
 */
import {
  ExerciseCategory,
  ExerciseRule,
  ExerciseSummary,
  FrameMetrics,
  LandmarkIndex,
  SafetyAlert,
  Skeleton,
  UserBaseline,
} from './types';
import { calculateAngle2D, calculateKneeValgusRatio, calculateSpineCurvature } from './geometry';
import { calculateUserBaseline } from './normalizer';
import { RepetitionStateMachine } from './state_machine';

export interface CustomExerciseDefinition {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string;
  primaryJointName: string;
  proximalLandmark: LandmarkIndex;
  vertexLandmark: LandmarkIndex;
  distalLandmark: LandmarkIndex;
  startAngle: number;
  inflectionAngle: number;
  peakAngle: number;
  isDescendingPhase: boolean; // true if angle decreases into flexion (e.g. squat/push-up), false if increasing (e.g. lateral raises)
  safetyChecks: {
    checkValgus?: boolean;
    checkSpine?: boolean;
    checkAsymmetry?: boolean;
  };
  createdAt: number;
}

export class CustomExerciseRule implements ExerciseRule {
  public id: string;
  public name: string;
  public category: ExerciseCategory;
  public cameraPerspective = 'any' as const;
  public primaryMetricLabel: string;
  public primaryMetricUnit = '°';
  public description: string;
  public instructions: string[];

  private def: CustomExerciseDefinition;
  private stateMachine: RepetitionStateMachine;
  private faultCounts: Record<string, number> = {};

  constructor(definition: CustomExerciseDefinition) {
    this.def = definition;
    this.id = definition.id;
    this.name = definition.name;
    this.category = definition.category;
    this.primaryMetricLabel = `${definition.primaryJointName} ROM`;
    this.description = definition.description || `Custom kinematic protocol for ${definition.name}`;
    this.instructions = [
      `Align camera to observe ${definition.primaryJointName} motion clearly.`,
      `Begin at starting angle (~${definition.startAngle}°).`,
      `Achieve target ROM (${definition.peakAngle}°).`,
      `Return smoothly to starting lockout.`,
    ];

    this.stateMachine = new RepetitionStateMachine({
      startThreshold: definition.startAngle,
      inflectionThreshold: definition.inflectionAngle,
      peakRomThreshold: definition.peakAngle,
      isDescendingPhase: definition.isDescendingPhase,
      minRepDurationMs: 400,
    });
  }

  public calibrate(skeleton: Skeleton): UserBaseline {
    return calculateUserBaseline(skeleton);
  }

  public evaluateFrame(skeleton: Skeleton, _baseline: UserBaseline, timestampMs: number): FrameMetrics {
    const lm = skeleton.landmarks;
    const alerts: SafetyAlert[] = [];

    // Calculate primary angle
    const primaryAngle = calculateAngle2D(
      lm[this.def.proximalLandmark],
      lm[this.def.vertexLandmark],
      lm[this.def.distalLandmark]
    );

    // Run safety checks if configured
    if (this.def.safetyChecks.checkValgus) {
      const valgusRatio = calculateKneeValgusRatio(
        lm[LandmarkIndex.LEFT_KNEE],
        lm[LandmarkIndex.RIGHT_KNEE],
        lm[LandmarkIndex.LEFT_ANKLE],
        lm[LandmarkIndex.RIGHT_ANKLE]
      );
      if (valgusRatio < 0.82) {
        alerts.push({
          id: 'custom_valgus',
          name: 'Knee Valgus Alert',
          message: 'Knees collapsing inward past allowable base ratio.',
          level: 'danger',
          joint: 'Knees',
          currentValue: valgusRatio,
          thresholdValue: 0.82,
          timestampMs,
        });
        this.faultCounts['knee_valgus'] = (this.faultCounts['knee_valgus'] || 0) + 1;
      }
    }

    if (this.def.safetyChecks.checkSpine) {
      const spineDeviation = calculateSpineCurvature(
        lm[LandmarkIndex.LEFT_EAR] || lm[LandmarkIndex.NOSE],
        lm[LandmarkIndex.LEFT_SHOULDER],
        lm[LandmarkIndex.LEFT_HIP]
      );
      if (spineDeviation > 22) {
        alerts.push({
          id: 'custom_spine',
          name: 'Spinal Flexion Alert',
          message: 'Excessive lumbar rounding detected during movement.',
          level: 'warning',
          joint: 'Spine',
          currentValue: Math.round(spineDeviation),
          thresholdValue: 22,
          timestampMs,
        });
        this.faultCounts['spinal_rounding'] = (this.faultCounts['spinal_rounding'] || 0) + 1;
      }
    }

    // Advance repetition state machine
    const repEvent = this.stateMachine.update(primaryAngle, timestampMs);

    const formScore = Math.max(
      60,
      Math.min(100, Math.round(100 - alerts.length * 15))
    );

    return {
      timestampMs,
      angles: {
        [this.def.primaryJointName]: primaryAngle,
      },
      distances: {},
      primaryMetric: primaryAngle,
      repState: this.stateMachine.getState(),
      repCount: this.stateMachine.getRepCount(),
      completedRep: repEvent || undefined,
      activeAlerts: alerts,
      telemetry: {
        targetRom: this.def.peakAngle,
        joint: this.def.primaryJointName,
      },
      formScore,
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.faultCounts = {};
  }

  public getSummary(): ExerciseSummary {
    const reps = this.stateMachine.getRepHistory();
    const totalReps = reps.length;
    const validReps = reps.filter((r) => r.passed).length;
    const averageRom =
      totalReps > 0 ? Math.round(reps.reduce((acc, r) => acc + r.peakRom, 0) / totalReps) : 0;
    const averageFormScore =
      totalReps > 0 ? Math.round(reps.reduce((acc, r) => acc + r.romScore, 0) / totalReps) : 100;
    const averageConcentricMs =
      totalReps > 0 ? Math.round(reps.reduce((acc, r) => acc + r.concentricMs, 0) / totalReps) : 0;
    const averageEccentricMs =
      totalReps > 0 ? Math.round(reps.reduce((acc, r) => acc + r.eccentricMs, 0) / totalReps) : 0;

    return {
      exerciseId: this.id,
      exerciseName: this.name,
      totalReps,
      validReps,
      averageRom,
      averageFormScore,
      averageConcentricMs,
      averageEccentricMs,
      totalDurationMs: 0,
      faultCounts: { ...this.faultCounts },
    };
  }
}

const CUSTOM_EXERCISES_STORAGE_KEY = 'posecraft_custom_exercises_v1';

export class CustomExerciseManager {
  private customExercises: Map<string, CustomExerciseDefinition> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CUSTOM_EXERCISES_STORAGE_KEY);
      if (raw) {
        const parsed: CustomExerciseDefinition[] = JSON.parse(raw);
        parsed.forEach((def) => this.customExercises.set(def.id, def));
      }
    } catch {
      // Graceful fallback
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.customExercises.values());
      localStorage.setItem(CUSTOM_EXERCISES_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignored
    }
  }

  public getAll(): CustomExerciseDefinition[] {
    return Array.from(this.customExercises.values());
  }

  public getById(id: string): CustomExerciseDefinition | undefined {
    return this.customExercises.get(id);
  }

  public save(definition: CustomExerciseDefinition) {
    this.customExercises.set(definition.id, definition);
    this.saveToStorage();
  }

  public delete(id: string): boolean {
    const deleted = this.customExercises.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  public exportJson(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  public importJson(jsonStr: string): number {
    try {
      const parsed: CustomExerciseDefinition[] = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return 0;
      let count = 0;
      parsed.forEach((item) => {
        if (item.id && item.name && item.vertexLandmark !== undefined) {
          this.save(item);
          count++;
        }
      });
      return count;
    } catch {
      return 0;
    }
  }

  public createRuleInstance(id: string): ExerciseRule | null {
    const def = this.customExercises.get(id);
    if (!def) return null;
    return new CustomExerciseRule(def);
  }
}

export const customExerciseManager = new CustomExerciseManager();
