import { describe, it, expect } from 'vitest';
import {
  calculateAngle2D,
  calculateAngle3D,
  calculateCollinearityDeviation,
  calculateSpineCurvature,
  calculateKneeValgusRatio,
  calculateUnilateralValgus,
  calculateNormalizedClearance,
  distance2D,
  distance3D,
  detectCameraPerspective,
} from '../src/engine/geometry';
import { Landmark, LandmarkIndex } from '../src/engine/types';

describe('Geometry Engine: Joint Angle Calculations', () => {
  it('calculates exact 90-degree right angle in 2D', () => {
    const a = { x: 0, y: 1 };
    const b = { x: 0, y: 0 }; // vertex
    const c = { x: 1, y: 0 };

    const angle = calculateAngle2D(a, b, c);
    expect(angle).toBeCloseTo(90, 2);
  });

  it('calculates exact 180-degree straight line in 2D', () => {
    const a = { x: -1, y: 0 };
    const b = { x: 0, y: 0 }; // vertex
    const c = { x: 1, y: 0 };

    const angle = calculateAngle2D(a, b, c);
    expect(angle).toBeCloseTo(180, 2);
  });

  it('calculates exact 45-degree angle in 2D', () => {
    const a = { x: 1, y: 1 };
    const b = { x: 0, y: 0 }; // vertex
    const c = { x: 1, y: 0 };

    const angle = calculateAngle2D(a, b, c);
    expect(angle).toBeCloseTo(45, 2);
  });

  it('calculates 3D joint angle with depth component', () => {
    const a = { x: 0, y: 1, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 0, y: 0, z: 1 };

    const angle = calculateAngle3D(a, b, c);
    expect(angle).toBeCloseTo(90, 2);
  });
});

describe('Geometry Engine: Biomechanical Deviation & Collinearity', () => {
  it('measures 0 collinearity deviation for a perfectly aligned segment', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 1, y: 1 };
    const p3 = { x: 2, y: 2 };

    const dev = calculateCollinearityDeviation(p1, p2, p3);
    expect(dev).toBeCloseTo(0, 2);
  });

  it('measures non-zero collinearity deviation when hips sag or pike', () => {
    const ankle = { x: 0, y: 0 };
    const hip = { x: 1, y: 0.3 }; // sag
    const shoulder = { x: 2, y: 0 };

    const dev = calculateCollinearityDeviation(ankle, hip, shoulder);
    expect(dev).toBeGreaterThan(10);
  });

  it('calculates spinal curvature correctly', () => {
    const cervical = { x: 0, y: 0, z: 0 };
    const thoracic = { x: 0.2, y: 0.5, z: 0 }; // curvature
    const sacrum = { x: 0, y: 1, z: 0 };

    const curvature = calculateSpineCurvature(cervical, thoracic, sacrum);
    expect(curvature).toBeGreaterThan(15);
  });

  it('detects knee valgus collapse ratio', () => {
    // Left and right ankles spaced at width 0.20 (0.40 and 0.60)
    const leftAnkle = { x: 0.40, y: 0.90 };
    const rightAnkle = { x: 0.60, y: 0.90 };
    // Knees cave inward to width 0.08 (0.46 and 0.54)
    const leftKnee = { x: 0.46, y: 0.70 };
    const rightKnee = { x: 0.54, y: 0.70 };

    const ratio = calculateKneeValgusRatio(leftKnee, rightKnee, leftAnkle, rightAnkle);
    expect(ratio).toBeLessThan(0.82);

    const hip = { x: 0.45, y: 0.5 };
    const ankle = { x: 0.45, y: 0.9 };
    const valgusKnee = { x: 0.50, y: 0.7 };
    const uniRatio = calculateUnilateralValgus(hip, valgusKnee, ankle);
    expect(uniRatio).toBeLessThan(0.85);
  });

  it('calculates normalized vertical clearance scale-invariantly', () => {
    const chinY = 0.25;
    const barY = 0.30;
    const torsoLength = 0.40;

    // Chin is above bar: in screen space (0 at top), chinY < barY
    const clearance = calculateNormalizedClearance(chinY, barY, torsoLength);
    expect(clearance).toBeCloseTo((0.30 - 0.25) / 0.40, 3);
  });
});

describe('Geometry Engine: Perspective Detection', () => {
  it('identifies frontal view when shoulders are spread apart', () => {
    const landmarks: Landmark[] = [];
    for (let i = 0; i < 33; i++) landmarks.push({ x: 0.5, y: 0.5, z: 0 });

    landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.35, y: 0.3, z: 0 };
    landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.65, y: 0.3, z: 0 };
    landmarks[LandmarkIndex.LEFT_HIP] = { x: 0.40, y: 0.6, z: 0 };
    landmarks[LandmarkIndex.RIGHT_HIP] = { x: 0.60, y: 0.6, z: 0 };

    const perspective = detectCameraPerspective(landmarks);
    expect(perspective).toBe('front_facing');
  });

  it('identifies side profile when shoulders overlap closely', () => {
    const landmarks: Landmark[] = [];
    for (let i = 0; i < 33; i++) landmarks.push({ x: 0.5, y: 0.5, z: 0 });

    landmarks[LandmarkIndex.LEFT_SHOULDER] = { x: 0.48, y: 0.3, z: 0 };
    landmarks[LandmarkIndex.RIGHT_SHOULDER] = { x: 0.52, y: 0.3, z: 0.1 };
    landmarks[LandmarkIndex.LEFT_HIP] = { x: 0.48, y: 0.6, z: 0 };
    landmarks[LandmarkIndex.RIGHT_HIP] = { x: 0.52, y: 0.6, z: 0.1 };

    const perspective = detectCameraPerspective(landmarks);
    expect(perspective).toBe('side_profile');
  });
});
