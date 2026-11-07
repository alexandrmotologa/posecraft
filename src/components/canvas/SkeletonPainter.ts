import { Landmark, LandmarkIndex, SafetyAlert } from '../../engine/types';

export interface BoneConnection {
  start: LandmarkIndex;
  end: LandmarkIndex;
  group: 'torso' | 'arm_left' | 'arm_right' | 'leg_left' | 'leg_right';
}

export const POSE_CONNECTIONS: BoneConnection[] = [
  // Torso & Spine
  { start: LandmarkIndex.LEFT_SHOULDER, end: LandmarkIndex.RIGHT_SHOULDER, group: 'torso' },
  { start: LandmarkIndex.LEFT_SHOULDER, end: LandmarkIndex.LEFT_HIP, group: 'torso' },
  { start: LandmarkIndex.RIGHT_SHOULDER, end: LandmarkIndex.RIGHT_HIP, group: 'torso' },
  { start: LandmarkIndex.LEFT_HIP, end: LandmarkIndex.RIGHT_HIP, group: 'torso' },

  // Left Arm
  { start: LandmarkIndex.LEFT_SHOULDER, end: LandmarkIndex.LEFT_ELBOW, group: 'arm_left' },
  { start: LandmarkIndex.LEFT_ELBOW, end: LandmarkIndex.LEFT_WRIST, group: 'arm_left' },
  { start: LandmarkIndex.LEFT_WRIST, end: LandmarkIndex.LEFT_INDEX, group: 'arm_left' },
  { start: LandmarkIndex.LEFT_WRIST, end: LandmarkIndex.LEFT_PINKY, group: 'arm_left' },

  // Right Arm
  { start: LandmarkIndex.RIGHT_SHOULDER, end: LandmarkIndex.RIGHT_ELBOW, group: 'arm_right' },
  { start: LandmarkIndex.RIGHT_ELBOW, end: LandmarkIndex.RIGHT_WRIST, group: 'arm_right' },
  { start: LandmarkIndex.RIGHT_WRIST, end: LandmarkIndex.RIGHT_INDEX, group: 'arm_right' },
  { start: LandmarkIndex.RIGHT_WRIST, end: LandmarkIndex.RIGHT_PINKY, group: 'arm_right' },

  // Left Leg
  { start: LandmarkIndex.LEFT_HIP, end: LandmarkIndex.LEFT_KNEE, group: 'leg_left' },
  { start: LandmarkIndex.LEFT_KNEE, end: LandmarkIndex.LEFT_ANKLE, group: 'leg_left' },
  { start: LandmarkIndex.LEFT_ANKLE, end: LandmarkIndex.LEFT_HEEL, group: 'leg_left' },
  { start: LandmarkIndex.LEFT_HEEL, end: LandmarkIndex.LEFT_FOOT_INDEX, group: 'leg_left' },

  // Right Leg
  { start: LandmarkIndex.RIGHT_HIP, end: LandmarkIndex.RIGHT_KNEE, group: 'leg_right' },
  { start: LandmarkIndex.RIGHT_KNEE, end: LandmarkIndex.RIGHT_ANKLE, group: 'leg_right' },
  { start: LandmarkIndex.RIGHT_ANKLE, end: LandmarkIndex.RIGHT_HEEL, group: 'leg_right' },
  { start: LandmarkIndex.RIGHT_HEEL, end: LandmarkIndex.RIGHT_FOOT_INDEX, group: 'leg_right' },
];

export function renderSkeletonHUD(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  canvasWidth: number,
  canvasHeight: number,
  activeAlerts: SafetyAlert[] = [],
  targetDepthY?: number
): void {
  if (!landmarks || landmarks.length < 33) return;

  // Determine stress state per anatomical bone group
  const groupStress: Record<string, 'safe' | 'warning' | 'danger'> = {
    torso: 'safe',
    arm_left: 'safe',
    arm_right: 'safe',
    leg_left: 'safe',
    leg_right: 'safe',
  };

  activeAlerts.forEach(alert => {
    const level = alert.level;
    const id = alert.id;

    // Torso / Spine faults
    if (
      id.includes('spine') ||
      id.includes('lumbar') ||
      id.includes('hip_sag') ||
      id.includes('hip_pike') ||
      id.includes('banana') ||
      id.includes('torso') ||
      id.includes('tech_neck')
    ) {
      groupStress.torso = level;
    }

    // Legs / Knee faults
    if (id.includes('valgus') || id.includes('knee') || id.includes('ankle') || id.includes('landing') || id.includes('stride')) {
      groupStress.leg_left = level;
      groupStress.leg_right = level;
    }

    // Arms / Shoulder faults
    if (id.includes('elbow') || id.includes('shoulder') || id.includes('arm') || id.includes('guard') || id.includes('chin') || id.includes('shrug')) {
      groupStress.arm_left = level;
      groupStress.arm_right = level;
    }
  });

  ctx.save();

  // 1. Render Bone Segments with Isolated Segment Colors
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const conn of POSE_CONNECTIONS) {
    const p1 = landmarks[conn.start];
    const p2 = landmarks[conn.end];

    if (!p1 || !p2 || (p1.visibility ?? 1) < 0.3 || (p2.visibility ?? 1) < 0.3) {
      continue;
    }

    const stress = groupStress[conn.group] || 'safe';
    let boneColor = '#06b6d4'; // cyan (safe)
    let boneGlow = 'rgba(6, 182, 212, 0.4)';

    if (stress === 'warning') {
      boneColor = '#f59e0b'; // amber
      boneGlow = 'rgba(245, 158, 11, 0.5)';
    } else if (stress === 'danger') {
      boneColor = '#ef4444'; // pulsing crimson
      boneGlow = 'rgba(239, 68, 68, 0.8)';
    }

    ctx.strokeStyle = boneColor;
    ctx.shadowColor = boneGlow;
    ctx.shadowBlur = stress === 'danger' ? 14 : 8;

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

    const isMajorJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(i);
    const radius = isMajorJoint ? 5.5 : 3.5;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();

    if (isMajorJoint) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 3. Render Target Depth Guideline (if set)
  if (targetDepthY !== undefined && targetDepthY > 0) {
    const targetY = targetDepthY * canvasHeight;
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)'; // emerald dashed target line
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvasWidth * 0.2, targetY);
    ctx.lineTo(canvasWidth * 0.8, targetY);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText('TARGET DEPTH PLANE', canvasWidth * 0.2 + 5, targetY - 6);
    ctx.restore();
  }

  ctx.restore();
}
