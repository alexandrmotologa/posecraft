import { Point2D, Point3D, Landmark, LandmarkIndex, CameraPerspective } from './types';

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance2D(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

/**
 * Calculates Euclidean distance between two 3D points.
 */
export function distance3D(p1: Point3D, p2: Point3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

/**
 * Calculates midpoint between two 2D points.
 */
export function midpoint2D(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Calculates midpoint between two 3D points.
 */
export function midpoint3D(p1: Point3D, p2: Point3D): Point3D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: ((p1.z ?? 0) + (p2.z ?? 0)) / 2,
  };
}

/**
 * Calculates the interior angle at vertex B formed by line segments BA and BC in degrees (0 to 180).
 */
export function calculateAngle2D(a: Point2D, b: Point2D, c: Point2D): number {
  const uX = a.x - b.x;
  const uY = a.y - b.y;
  const vX = c.x - b.x;
  const vY = c.y - b.y;

  const dot = uX * vX + uY * vY;
  const magU = Math.hypot(uX, uY);
  const magV = Math.hypot(vX, vY);

  if (magU === 0 || magV === 0) return 0;

  const cosTheta = clamp(dot / (magU * magV), -1, 1);
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Calculates the 3D joint angle at vertex B formed by segments BA and BC in degrees.
 */
export function calculateAngle3D(a: Point3D, b: Point3D, c: Point3D): number {
  const uX = a.x - b.x;
  const uY = a.y - b.y;
  const uZ = (a.z ?? 0) - (b.z ?? 0);

  const vX = c.x - b.x;
  const vY = c.y - b.y;
  const vZ = (c.z ?? 0) - (b.z ?? 0);

  const dot = uX * vX + uY * vY + uZ * vZ;
  const magU = Math.hypot(uX, uY, uZ);
  const magV = Math.hypot(vX, vY, vZ);

  if (magU === 0 || magV === 0) return 0;

  const cosTheta = clamp(dot / (magU * magV), -1, 1);
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Calculates angle of vector (p1 -> p2) relative to the horizontal floor axis (0 to 180 degrees).
 */
export function calculateHorizontalAngle(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const rad = Math.atan2(Math.abs(dy), Math.abs(dx));
  return (rad * 180) / Math.PI;
}

/**
 * Calculates deviation of vector (p1 -> p2) from the true vertical vector (0 degrees is straight vertical).
 */
export function calculateVerticalAngle(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const rad = Math.atan2(Math.abs(dx), Math.abs(dy));
  return (rad * 180) / Math.PI;
}

/**
 * Measures collinearity deviation across three consecutive points.
 * A value of 0 indicates a perfectly straight 180-degree line.
 */
export function calculateCollinearityDeviation(p1: Point2D, p2: Point2D, p3: Point2D): number {
  const angle = calculateAngle2D(p1, p2, p3);
  return Math.abs(180 - angle);
}

/**
 * Computes spinal curvature deviation across neck, thoracic mid-point, and sacrum/pelvis.
 */
export function calculateSpineCurvature(cervical: Point3D, thoracic: Point3D, sacrum: Point3D): number {
  const angle = calculateAngle3D(cervical, thoracic, sacrum);
  return Math.abs(180 - angle);
}

/**
 * Calculates frontal plane Knee Valgus ratio for bilateral movements (Squats).
 * Compares the inter-knee width to the inter-ankle width.
 * A ratio below 0.82 indicates inward medial knee collapse.
 */
export function calculateKneeValgusRatio(
  leftKnee: Point2D,
  rightKnee: Point2D,
  leftAnkle: Point2D,
  rightAnkle: Point2D
): number {
  const ankleDist = Math.abs(rightAnkle.x - leftAnkle.x);
  const kneeDist = Math.abs(rightKnee.x - leftKnee.x);

  if (ankleDist < 0.01) return 1.0;
  return kneeDist / ankleDist;
}

/**
 * Calculates frontal plane Knee Valgus for unilateral movements (Bulgarian Split, Lunges).
 * Evaluates medial deviation of knee relative to hip and ankle vertical axis.
 */
export function calculateUnilateralValgus(hip: Point2D, knee: Point2D, ankle: Point2D): number {
  const hipAnkleDistX = Math.abs(hip.x - ankle.x);
  if (hipAnkleDistX < 0.01) {
    const deviation = Math.abs(knee.x - ankle.x);
    return Math.max(0, 1.0 - deviation * 5);
  }
  return Math.abs(knee.x - ankle.x) / hipAnkleDistX;
}

/**
 * Computes Craniovertebral Angle (CVA) between ear tragus and C7 (neck base) relative to horizontal.
 * Normal healthy angle is 50-55 degrees. Less than 48 degrees represents forward head posture (tech neck).
 */
export function calculateCraniovertebralAngle(ear: Point2D, c7: Point2D): number {
  const dx = ear.x - c7.x;
  const dy = c7.y - ear.y; // In screen space, ear is higher than c7 so dy > 0
  const rad = Math.atan2(dy, Math.abs(dx));
  return (rad * 180) / Math.PI;
}

/**
 * Normalizes vertical distance against torso baseline.
 * Since screen coordinates have y=0 at top, higher physical elevation has lower y.
 */
export function calculateNormalizedClearance(pointY: number, referenceY: number, torsoLength: number): number {
  if (torsoLength <= 0) return 0;
  return (referenceY - pointY) / torsoLength;
}

/**
 * Clamps a number between a minimum and maximum bound.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Determines whether the user is facing the camera frontally or positioned in side profile.
 * Compares the projected shoulder width to hip-to-shoulder torso length.
 */
export function detectCameraPerspective(landmarks: Landmark[]): CameraPerspective {
  if (!landmarks || landmarks.length < 33) return 'any';

  const leftShoulder = landmarks[LandmarkIndex.LEFT_SHOULDER];
  const rightShoulder = landmarks[LandmarkIndex.RIGHT_SHOULDER];
  const leftHip = landmarks[LandmarkIndex.LEFT_HIP];
  const rightHip = landmarks[LandmarkIndex.RIGHT_HIP];

  const shoulderWidth = distance2D(leftShoulder, rightShoulder);
  const midShoulder = midpoint2D(leftShoulder, rightShoulder);
  const midHip = midpoint2D(leftHip, rightHip);
  const torsoLength = distance2D(midShoulder, midHip);

  if (torsoLength <= 0) return 'any';

  const ratio = shoulderWidth / torsoLength;
  // In side profile, left and right shoulders overlap closely, ratio is typically < 0.28
  // In front-facing view, ratio is typically > 0.40
  if (ratio < 0.28) {
    return 'side_profile';
  }
  return 'front_facing';
}
