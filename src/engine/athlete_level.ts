/**
 * Athlete Experience & Biomechanical Profile Engine.
 * Configures kinematic scoring, valgus sensitivities, and velocity thresholds based on athlete tier.
 */

export type AthleteLevelTier = 'rehab' | 'beginner' | 'intermediate' | 'elite';

export interface AthleteProfileConfig {
  id: AthleteLevelTier;
  title: string;
  badge: string;
  description: string;
  valgusThreshold: number; // minimum knee/ankle width ratio before alert
  asymmetryTolerancePercent: number; // max acceptable left/right asymmetry %
  targetDepthAngle: number; // target knee angle for squats
  velocityLossCutoffPercent: number; // VBT termination threshold
  strictTempoEnforced: boolean;
}

export const ATHLETE_PROFILES: Record<AthleteLevelTier, AthleteProfileConfig> = {
  rehab: {
    id: 'rehab',
    title: 'Physical Therapy & Rehab',
    badge: 'Clinical',
    description: 'Prioritizes joint preservation, pain-free movement arc, and zero valgus/lumbar shear.',
    valgusThreshold: 0.90, // extra sensitive to knee collapse
    asymmetryTolerancePercent: 12,
    targetDepthAngle: 90, // safe parallel limit
    velocityLossCutoffPercent: 30,
    strictTempoEnforced: false,
  },
  beginner: {
    id: 'beginner',
    title: 'Beginner / General Fitness',
    badge: 'Foundations',
    description: 'Forgiving symmetry tolerances and educational coaching cues for motor learning.',
    valgusThreshold: 0.82,
    asymmetryTolerancePercent: 15,
    targetDepthAngle: 88,
    velocityLossCutoffPercent: 25,
    strictTempoEnforced: false,
  },
  intermediate: {
    id: 'intermediate',
    title: 'Intermediate Athlete',
    badge: 'Standard',
    description: 'Balanced hypertrophic tracking with 20% VBT velocity-loss fatigue limit.',
    valgusThreshold: 0.85,
    asymmetryTolerancePercent: 10,
    targetDepthAngle: 82,
    velocityLossCutoffPercent: 20,
    strictTempoEnforced: true,
  },
  elite: {
    id: 'elite',
    title: 'Competitive / Elite Strength',
    badge: 'Pro Tier',
    description: 'Strict below-parallel depth (<75°), tight bilateral symmetry (<5%), and power decay monitoring.',
    valgusThreshold: 0.88,
    asymmetryTolerancePercent: 5,
    targetDepthAngle: 75,
    velocityLossCutoffPercent: 15,
    strictTempoEnforced: true,
  },
};
