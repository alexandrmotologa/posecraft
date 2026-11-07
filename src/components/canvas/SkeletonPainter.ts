import { Landmark, LandmarkIndex, SafetyLevel } from '../../engine/types';

export interface BoneConnection {
  start: LandmarkIndex;
  end: LandmarkIndex;
  group: 'torso' | 'arm' | 'leg' | 'face';
}

export const POSE_CONNECTIONS: BoneConnection[] = [
  // Torso
  { start: LandmarkIndex.LEFT_SHOULDER, end: LandmarkIndex.RIGHT_SHOULDER, group: 'torso' },
  { start: LandmarkIndex.LEFT_SHOULDER, end: LandmarkIndex.LEFT_HIP, group: 'torso' },
  { start: LandmarkIndex.RIGHT_SHOULDER, end: LandmarkIndex.RIGHT_HIP, group: 'torso' },
  { start: LandmarkIndex.LEFT_HIP, end: LandmarkIndex.RIGHT_HIP, group: 'torso' },

  // Left Arm
  { start: LandmarkIndex.LEFT_SHOULDER, end: LandmarkIndex.LEFT_ELBOW, group: 'arm' },
  { start: LandmarkIndex.LEFT_ELBOW, end: LandmarkIndex.LEFT_WRIST, group: 'arm' },
  { start: LandmarkIndex.LEFT_WRIST, end: LandmarkIndex.LEFT_INDEX, group: 'arm' },
  { start: LandmarkIndex.LEFT_WRIST, end: LandmarkIndex.LEFT_PINKY, group: 'arm' },

  // Right Arm
  { start: LandmarkIndex.RIGHT_SHOULDER, end: LandmarkIndex.RIGHT_ELBOW, group: 'arm' },
  { start: LandmarkIndex.RIGHT_ELBOW, end: LandmarkIndex.RIGHT_WRIST, group: 'arm' },
  { start: LandmarkIndex.RIGHT_WRIST, end: LandmarkIndex.RIGHT_INDEX, group: 'arm' },
  { start: LandmarkIndex.RIGHT_WRIST, end: LandmarkIndex.RIGHT_PINKY, group: 'arm' },

  // Left Leg
  { start: LandmarkIndex.LEFT_HIP, end: LandmarkIndex.LEFT_KNEE, group: 'leg' },
  { start: LandmarkIndex.LEFT_KNEE, end: LandmarkIndex.LEFT_ANKLE, group: 'leg' },
  { start: LandmarkIndex.LEFT_ANKLE, end: LandmarkIndex.LEFT_HEEL, group: 'leg' },
  { start: LandmarkIndex.LEFT_HEEL, end: LandmarkIndex.LEFT_FOOT_INDEX, group: 'leg' },

  // Right Leg
  { start: LandmarkIndex.RIGHT_HIP, end: LandmarkIndex.RIGHT_KNEE, group: 'leg' },
  { start: LandmarkIndex.RIGHT_KNEE, end: LandmarkIndex.RIGHT_ANKLE, group: 'leg' },
  { start: LandmarkIndex.RIGHT_ANKLE, end: LandmarkIndex.RIGHT_HEEL, group: 'leg' },
  { start: LandmarkIndex.RIGHT_HEEL, end: LandmarkIndex.RIGHT_FOOT_INDEX, group: 'leg' },
];

export function renderSkeletonHUD(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  canvasWidth: number,
  canvasHeight: number,
  safetyLevel: SafetyLevel = 'safe'
): void {
  if (!landmarks || landmarks.length < 33) return;

  // Color scheme based on biomechanical safety state
  let boneColor = '#06b6d4'; // cyan
  let boneGlow = 'rgba(6, 182, 212, 0.4)';
  let jointColor = '#22d3ee';

  if (safetyLevel === 'warning') {
    boneColor = '#f59e0b'; // amber
    boneGlow = 'rgba(245, 158, 11, 0.5)';
    jointColor = '#fbbf24';
  } else if (safetyLevel === 'danger') {
    boneColor = '#ef4444'; // crimson red
    boneGlow = 'rgba(239, 68, 68, 0.7)';
    jointColor = '#f87171';
  }

  ctx.save();

  // 1. Render Bone Segments
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = boneColor;
  ctx.shadowColor = boneGlow;
  ctx.shadowBlur = 10;

  for (const conn of POSE_CONNECTIONS) {
    const p1 = landmarks[conn.start];
    const p2 = landmarks[conn.end];

    if (!p1 || !p2 || (p1.visibility ?? 1) < 0.3 || (p2.visibility ?? 1) < 0.3) {
      continue;
    }

    const x1 = p1.x * canvasWidth;
    const y1 = p1.y * canvasHeight;
    const x2 = p2.x * canvasWidth;
    const y2 = p2.y * canvasHeight;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // 2. Render Joint Vertices
  ctx.shadowBlur = 8;
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm || (lm.visibility ?? 1) < 0.3) continue;

    const x = lm.x * canvasWidth;
    const y = lm.y * canvasHeight;

    // Major joints (shoulders, elbows, wrists, hips, knees, ankles) get larger nodes
    const isMajorJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(i);
    const radius = isMajorJoint ? 5.5 : 3.5;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = jointColor;
    ctx.fill();

    // Outer ring for major joints
    if (isMajorJoint) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}
