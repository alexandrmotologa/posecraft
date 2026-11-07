import { Landmark, LandmarkIndex, Skeleton, UserBaseline } from './types';
import { distance3D, midpoint2D, midpoint3D } from './geometry';

/**
 * Computes an anatomical baseline from an initial calibration skeleton.
 */
export function calculateUserBaseline(skeleton: Skeleton): UserBaseline {
  const lm = skeleton.landmarks;
  if (!lm || lm.length < 33) {
    return {
      torsoLength: 0.35,
      shoulderWidth: 0.25,
      hipWidth: 0.20,
      leftFemurLength: 0.30,
      rightFemurLength: 0.30,
      leftTibiaLength: 0.30,
      rightTibiaLength: 0.30,
      leftArmLength: 0.35,
      rightArmLength: 0.35,
      standingHeight: 0.85,
    };
  }

  const leftShoulder = lm[LandmarkIndex.LEFT_SHOULDER];
  const rightShoulder = lm[LandmarkIndex.RIGHT_SHOULDER];
  const leftHip = lm[LandmarkIndex.LEFT_HIP];
  const rightHip = lm[LandmarkIndex.RIGHT_HIP];
  const leftKnee = lm[LandmarkIndex.LEFT_KNEE];
  const rightKnee = lm[LandmarkIndex.RIGHT_KNEE];
  const leftAnkle = lm[LandmarkIndex.LEFT_ANKLE];
  const rightAnkle = lm[LandmarkIndex.RIGHT_ANKLE];
  const leftElbow = lm[LandmarkIndex.LEFT_ELBOW];
  const rightElbow = lm[LandmarkIndex.RIGHT_ELBOW];
  const leftWrist = lm[LandmarkIndex.LEFT_WRIST];
  const rightWrist = lm[LandmarkIndex.RIGHT_WRIST];
  const nose = lm[LandmarkIndex.NOSE];

  const midShoulder = midpoint3D(leftShoulder, rightShoulder);
  const midHip = midpoint3D(leftHip, rightHip);
  const midAnkle = midpoint3D(leftAnkle, rightAnkle);

  const torsoLength = Math.max(0.1, distance3D(midShoulder, midHip));
  const shoulderWidth = Math.max(0.05, distance3D(leftShoulder, rightShoulder));
  const hipWidth = Math.max(0.05, distance3D(leftHip, rightHip));

  const leftFemurLength = distance3D(leftHip, leftKnee);
  const rightFemurLength = distance3D(rightHip, rightKnee);
  const leftTibiaLength = distance3D(leftKnee, leftAnkle);
  const rightTibiaLength = distance3D(rightKnee, rightAnkle);

  const leftArmLength = distance3D(leftShoulder, leftElbow) + distance3D(leftElbow, leftWrist);
  const rightArmLength = distance3D(rightShoulder, rightElbow) + distance3D(rightElbow, rightWrist);

  const standingHeight = distance3D(nose, midAnkle);

  return {
    torsoLength,
    shoulderWidth,
    hipWidth,
    leftFemurLength,
    rightFemurLength,
    leftTibiaLength,
    rightTibiaLength,
    leftArmLength,
    rightArmLength,
    standingHeight,
  };
}

/**
 * Normalizes a 2D or 3D point relative to the hip midpoint and torso length.
 * The origin (0,0) becomes the athlete's hip center, and coordinates scale with torso length = 1.0.
 */
export function normalizeCoordinates(lm: Landmark, baseline: UserBaseline, landmarks: Landmark[]): Landmark {
  if (!baseline.torsoLength || baseline.torsoLength <= 0) return lm;

  const leftHip = landmarks[LandmarkIndex.LEFT_HIP];
  const rightHip = landmarks[LandmarkIndex.RIGHT_HIP];
  const midHip = midpoint2D(leftHip, rightHip);

  return {
    ...lm,
    x: (lm.x - midHip.x) / baseline.torsoLength,
    y: (lm.y - midHip.y) / baseline.torsoLength,
    z: lm.z ? lm.z / baseline.torsoLength : 0,
  };
}
