import { Landmark, LandmarkIndex, Skeleton } from './types';

export interface PoseDetectorEngine {
  initialize(): Promise<void>;
  detectForVideo(videoElement: HTMLVideoElement, timestampMs: number): Skeleton | null;
  close(): void;
}

/**
 * Generates anatomically accurate 33-point synthetic kinematic skeletons.
 * Cycle progress is 0.0 -> 1.0 (0: start/lockout, 0.5: peak concentric/depth, 1.0: return lockout).
 */
export function generateKinematicSkeleton(
  exerciseId: string,
  progress: number, // 0.0 to 1.0
  timestampMs: number,
  faultMode?: 'valgus' | 'rounding' | 'kipping' | 'sag' | 'none'
): Skeleton {
  // Waveform parameter: 0 at start, 1 at bottom/peak, 0 at return
  // Using smooth sine curve: sin(progress * PI)
  const t = Math.sin(progress * Math.PI);

  const landmarks: Landmark[] = [];
  for (let i = 0; i < 33; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.99, presence: 0.99 });
  }

  // Base human geometry in normalized screen coordinates (0 to 1)
  const headX = 0.5;
  const headY = 0.22;

  landmarks[LandmarkIndex.NOSE] = { x: headX, y: headY, z: 0, visibility: 0.99 };
  landmarks[LandmarkIndex.LEFT_EYE] = { x: headX - 0.02, y: headY - 0.02, z: -0.02, visibility: 0.99 };
  landmarks[LandmarkIndex.RIGHT_EYE] = { x: headX + 0.02, y: headY - 0.02, z: -0.02, visibility: 0.99 };
  landmarks[LandmarkIndex.LEFT_EAR] = { x: headX - 0.04, y: headY - 0.01, z: 0, visibility: 0.99 };
  landmarks[LandmarkIndex.RIGHT_EAR] = { x: headX + 0.04, y: headY - 0.01, z: 0, visibility: 0.99 };

  // Set up specific exercise kinetics
  switch (exerciseId) {
    case 'back_squat':
    case 'bulgarian_squat':
    case 'fms_overhead_squat':
    case 'sit_to_stand': {
      // Squatting: hips descend and translate slightly back, knees track forward/down
      const hipDepth = t * 0.16; // descends by 0.16 screen units
      const kneeY = 0.68 + t * 0.04;
      const hipY = 0.50 + hipDepth;
      const hipX = 0.50 - t * 0.03; // slight hip back shift

      const valgusOffset = faultMode === 'valgus' ? t * 0.07 : 0; // inward medial collapse

      landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.45 - t * 0.02, y: 0.30 + hipDepth, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.55 - t * 0.02, y: 0.30 + hipDepth, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ELBOW] = { x: 0.44, y: 0.38 + hipDepth, z: 0.05, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ELBOW] = { x: 0.56, y: 0.38 + hipDepth, z: 0.05, visibility: 0.99 };
      landmarks[LandmarkIndex.LEFT_WRIST] = { x: 0.46, y: 0.29 + hipDepth, z: 0.02, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_WRIST] = { x: 0.54, y: 0.29 + hipDepth, z: 0.02, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_HIP] = { x: hipX - 0.06, y: hipY, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_HIP] = { x: hipX + 0.06, y: hipY, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_KNEE] = { x: 0.43 + valgusOffset, y: kneeY, z: 0.04, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_KNEE] = { x: 0.57 - valgusOffset, y: kneeY, z: 0.04, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ANKLE] = { x: 0.44, y: 0.88, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ANKLE] = { x: 0.56, y: 0.88, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.LEFT_HEEL] = { x: 0.43, y: 0.90, z: -0.02, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_HEEL] = { x: 0.57, y: 0.90, z: -0.02, visibility: 0.99 };
      landmarks[LandmarkIndex.LEFT_FOOT_INDEX] = { x: 0.43, y: 0.91, z: 0.05, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_FOOT_INDEX] = { x: 0.57, y: 0.91, z: 0.05, visibility: 0.99 };
      break;
    }

    case 'pull_ups': {
      // Pull-up: body rises, elbows flex from >160 to ~45 degrees, chin rises above bar
      const lift = t * 0.18; // body rises by 0.18 screen units
      const kipping = faultMode === 'kipping' ? Math.sin(progress * 2 * Math.PI) * 0.08 : 0;

      // Hands fixed on bar at y = 0.12
      landmarks[LandmarkIndex.LEFT_WRIST] = { x: 0.42, y: 0.12, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_WRIST] = { x: 0.58, y: 0.12, z: 0, visibility: 0.99 };

      // Elbows flare and bend
      landmarks[LandmarkIndex.LEFT_ELBOW] = { x: 0.38 - t * 0.04, y: 0.24 - lift * 0.5, z: 0.03, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ELBOW] = { x: 0.62 + t * 0.04, y: 0.24 - lift * 0.5, z: 0.03, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.45, y: 0.32 - lift, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.55, y: 0.32 - lift, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.NOSE] = { x: 0.5, y: 0.25 - lift, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_HIP] = { x: 0.46, y: 0.56 - lift, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_HIP] = { x: 0.54, y: 0.56 - lift, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_KNEE] = { x: 0.46 + kipping, y: 0.74 - lift, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_KNEE] = { x: 0.54 + kipping, y: 0.74 - lift, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ANKLE] = { x: 0.46 + kipping * 1.5, y: 0.90 - lift, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ANKLE] = { x: 0.54 + kipping * 1.5, y: 0.90 - lift, z: 0, visibility: 0.99 };
      break;
    }

    case 'push_ups': {
      // Push-up: horizontal prone position. Chest lowers from y=0.48 to y=0.62
      const sagOffset = faultMode === 'sag' ? t * 0.08 : 0;
      const chestDrop = t * 0.12;

      landmarks[LandmarkIndex.LEFT_WRIST] = { x: 0.35, y: 0.65, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_WRIST] = { x: 0.35, y: 0.65, z: 0.1, visibility: 0.99 };

      // Elbows flex
      landmarks[LandmarkIndex.LEFT_ELBOW] = { x: 0.30 - t * 0.05, y: 0.56 + chestDrop * 0.6, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ELBOW] = { x: 0.30 - t * 0.05, y: 0.56 + chestDrop * 0.6, z: 0.1, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.34, y: 0.48 + chestDrop, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.34, y: 0.48 + chestDrop, z: 0.1, visibility: 0.99 };

      landmarks[LandmarkIndex.NOSE] = { x: 0.30, y: 0.46 + chestDrop, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_HIP] = { x: 0.54, y: 0.52 + chestDrop * 0.6 + sagOffset, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_HIP] = { x: 0.54, y: 0.52 + chestDrop * 0.6 + sagOffset, z: 0.1, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_KNEE] = { x: 0.68, y: 0.58 + chestDrop * 0.3, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_KNEE] = { x: 0.68, y: 0.58 + chestDrop * 0.3, z: 0.1, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ANKLE] = { x: 0.82, y: 0.64, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ANKLE] = { x: 0.82, y: 0.64, z: 0.1, visibility: 0.99 };
      break;
    }

    case 'deadlift': {
      // Deadlift: hip hinge from floor to upright lockout
      const rounding = faultMode === 'rounding' ? 0.12 : 0;
      const hinge = (1 - t) * 0.20; // 0 at top lockout, 0.20 at floor

      landmarks[LandmarkIndex.LEFT_EAR] = { x: 0.44 - hinge * 0.5 - rounding * 0.5, y: 0.22 + hinge * 0.8, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_EAR] = { x: 0.56 - hinge * 0.5 - rounding * 0.5, y: 0.22 + hinge * 0.8, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.NOSE] = { x: 0.50 - hinge * 0.5 - rounding * 0.5, y: 0.24 + hinge * 0.8, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.46 - hinge * 0.4 - rounding, y: 0.32 + hinge, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.54 - hinge * 0.4 - rounding, y: 0.32 + hinge, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_HIP] = { x: 0.48 - hinge * 0.5, y: 0.52 + hinge * 0.6, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_HIP] = { x: 0.52 - hinge * 0.5, y: 0.52 + hinge * 0.6, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_KNEE] = { x: 0.48 - hinge * 0.1, y: 0.70 + hinge * 0.2, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_KNEE] = { x: 0.52 - hinge * 0.1, y: 0.70 + hinge * 0.2, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ANKLE] = { x: 0.48, y: 0.88, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ANKLE] = { x: 0.52, y: 0.88, z: 0, visibility: 0.99 };

      // Hands hold bar at shin / hip
      landmarks[LandmarkIndex.LEFT_WRIST] = { x: 0.48 - hinge * 0.3, y: 0.54 + hinge * 1.4, z: 0.05, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_WRIST] = { x: 0.52 - hinge * 0.3, y: 0.54 + hinge * 1.4, z: 0.05, visibility: 0.99 };
      break;
    }

    case 'plank': {
      // Horizontal straight plank line
      const sag = faultMode === 'sag' ? 0.08 : 0;
      landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.30, y: 0.55, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.30, y: 0.55, z: 0.1, visibility: 0.99 };
      landmarks[LandmarkIndex.LEFT_ELBOW] = { x: 0.30, y: 0.66, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ELBOW] = { x: 0.30, y: 0.66, z: 0.1, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_HIP] = { x: 0.52, y: 0.56 + sag, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_HIP] = { x: 0.52, y: 0.56 + sag, z: 0.1, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_KNEE] = { x: 0.68, y: 0.58, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_KNEE] = { x: 0.68, y: 0.58, z: 0.1, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ANKLE] = { x: 0.84, y: 0.60, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ANKLE] = { x: 0.84, y: 0.60, z: 0.1, visibility: 0.99 };
      break;
    }

    case 'bicep_curls': {
      // Curls: standing upright, elbow stationary, wrist curls up
      const curl = t * 0.22;
      landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.44, y: 0.30, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.56, y: 0.30, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ELBOW] = { x: 0.44, y: 0.48, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ELBOW] = { x: 0.56, y: 0.48, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_WRIST] = { x: 0.44, y: 0.66 - curl, z: 0.05, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_WRIST] = { x: 0.56, y: 0.66 - curl, z: 0.05, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_HIP] = { x: 0.46, y: 0.54, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_HIP] = { x: 0.54, y: 0.54, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_KNEE] = { x: 0.46, y: 0.72, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_KNEE] = { x: 0.54, y: 0.72, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ANKLE] = { x: 0.46, y: 0.90, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ANKLE] = { x: 0.54, y: 0.90, z: 0, visibility: 0.99 };
      break;
    }

    default: {
      // Default natural standing posture with slight dynamic movement
      landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.44, y: 0.30 + t * 0.03, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.56, y: 0.30 + t * 0.03, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ELBOW] = { x: 0.42, y: 0.46 + t * 0.05, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ELBOW] = { x: 0.58, y: 0.46 + t * 0.05, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_WRIST] = { x: 0.42, y: 0.62 + t * 0.08, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_WRIST] = { x: 0.58, y: 0.62 + t * 0.08, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_HIP] = { x: 0.46, y: 0.54 + t * 0.02, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_HIP] = { x: 0.54, y: 0.54 + t * 0.02, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_KNEE] = { x: 0.46, y: 0.72, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_KNEE] = { x: 0.54, y: 0.72, z: 0, visibility: 0.99 };

      landmarks[LandmarkIndex.LEFT_ANKLE] = { x: 0.46, y: 0.90, z: 0, visibility: 0.99 };
      landmarks[LandmarkIndex.RIGHT_ANKLE] = { x: 0.54, y: 0.90, z: 0, visibility: 0.99 };
      break;
    }
  }

  return {
    landmarks,
    timestampMs,
  };
}

/**
 * MediaPipe Pose Landmarker detector implementation.
 * Wraps @mediapipe/tasks-vision with graceful fallback and robust error handling.
 */
export class MediaPipePoseDetector implements PoseDetectorEngine {
  private poseLandmarker: unknown = null;
  private isReady: boolean = false;

  public async initialize(): Promise<void> {
    if (this.isReady) return;

    try {
      const vision = await import('@mediapipe/tasks-vision');
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.poseLandmarker = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isReady = true;
    } catch {
      // If WebGPU / remote network CDN fails, system seamlessly operates in simulated/manual mode
      this.isReady = false;
    }
  }

  public detectForVideo(videoElement: HTMLVideoElement, timestampMs: number): Skeleton | null {
    if (!this.isReady || !this.poseLandmarker) return null;

    try {
      const detector = this.poseLandmarker as {
        detectForVideo: (video: HTMLVideoElement, time: number) => {
          landmarks?: Landmark[][];
          worldLandmarks?: Landmark[][];
        };
      };

      const result = detector.detectForVideo(videoElement, timestampMs);
      if (result && result.landmarks && result.landmarks.length > 0) {
        return {
          landmarks: result.landmarks[0],
          worldLandmarks: result.worldLandmarks ? result.worldLandmarks[0] : undefined,
          timestampMs,
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  public close(): void {
    if (this.poseLandmarker) {
      try {
        (this.poseLandmarker as { close?: () => void }).close?.();
      } catch {
        // Ignored
      }
      this.poseLandmarker = null;
    }
    this.isReady = false;
  }
}
