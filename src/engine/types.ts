export enum LandmarkIndex {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface Landmark extends Point3D {
  visibility?: number;
  presence?: number;
}

export interface Skeleton {
  landmarks: Landmark[];
  worldLandmarks?: Landmark[];
  timestampMs: number;
}

export interface UserBaseline {
  torsoLength: number; // distance between midpoint of shoulders and midpoint of hips
  shoulderWidth: number; // distance between left and right shoulder
  hipWidth: number; // distance between left and right hip
  leftFemurLength: number;
  rightFemurLength: number;
  leftTibiaLength: number;
  rightTibiaLength: number;
  leftArmLength: number;
  rightArmLength: number;
  standingHeight: number;
}

export type RepState = 'IDLE' | 'ARMED' | 'CONCENTRIC' | 'PEAK' | 'ECCENTRIC' | 'COMPLETED';

export type SafetyLevel = 'safe' | 'warning' | 'danger';

export interface SafetyAlert {
  id: string;
  name: string;
  message: string;
  level: SafetyLevel;
  joint?: string;
  currentValue?: number;
  thresholdValue?: number;
  timestampMs: number;
}

export interface RepetitionEvent {
  repNumber: number;
  startTimeMs: number;
  peakTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  concentricMs: number;
  eccentricMs: number;
  peakRom: number;
  romScore: number; // 0 to 100
  faults: string[];
  passed: boolean;
  tempoString: string; // e.g. "2.1s / 1.4s"
}

export interface FrameMetrics {
  timestampMs: number;
  angles: Record<string, number>;
  distances: Record<string, number>;
  primaryMetric: number;
  repState: RepState;
  repCount: number;
  activeAlerts: SafetyAlert[];
  telemetry: Record<string, number | string | boolean>;
  formScore: number; // 0 to 100 real-time score
}

export type ExerciseCategory =
  | 'calisthenics'
  | 'barbell'
  | 'unilateral'
  | 'conditioning'
  | 'athletic'
  | 'rehab';

export type CameraPerspective = 'side_profile' | 'front_facing' | 'any';

export interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  totalReps: number;
  validReps: number;
  averageRom: number;
  averageFormScore: number;
  averageConcentricMs: number;
  averageEccentricMs: number;
  totalDurationMs: number;
  faultCounts: Record<string, number>;
}

export interface ExerciseRule {
  id: string;
  name: string;
  category: ExerciseCategory;
  cameraPerspective: CameraPerspective;
  primaryMetricLabel: string;
  primaryMetricUnit: string;
  description: string;
  instructions: string[];

  calibrate(skeleton: Skeleton): UserBaseline;
  evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics;
  reset(): void;
  getSummary(): ExerciseSummary;
}
