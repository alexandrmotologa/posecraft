import { describe, it, expect } from 'vitest';
import { ALL_EXERCISE_IDS, createExerciseRule, EXERCISE_SUITES } from '../src/exercises/registry';
import { generateKinematicSkeleton } from '../src/engine/detector';

describe('Exercise Catalog: Full 28-Module Suite Verification', () => {
  it('contains exactly 6 suites and 28 registered modules', () => {
    expect(EXERCISE_SUITES.length).toBe(6);
    expect(ALL_EXERCISE_IDS.length).toBe(28);

    const totalSuiteModules = EXERCISE_SUITES.reduce((acc, s) => acc + s.moduleIds.length, 0);
    expect(totalSuiteModules).toBe(28);
  });

  ALL_EXERCISE_IDS.forEach(exerciseId => {
    it(`evaluates frames and state transitions cleanly for [${exerciseId}]`, () => {
      const rule = createExerciseRule(exerciseId);
      expect(rule.id).toBe(exerciseId);
      expect(rule.name.length).toBeGreaterThan(0);
      expect(rule.primaryMetricLabel.length).toBeGreaterThan(0);

      // Calibration step
      const calibrationSkeleton = generateKinematicSkeleton(exerciseId, 0.0, 1000);
      const baseline = rule.calibrate(calibrationSkeleton);
      expect(baseline.torsoLength).toBeGreaterThan(0);

      // Evaluate 20 sequential kinematic frames
      for (let step = 0; step <= 20; step++) {
        const progress = (step % 10) / 10;
        const timestampMs = 1000 + step * 100;
        const skeleton = generateKinematicSkeleton(exerciseId, progress, timestampMs);

        const metrics = rule.evaluateFrame(skeleton, baseline, timestampMs);
        expect(metrics).toBeDefined();
        expect(metrics.timestampMs).toBe(timestampMs);
        expect(metrics.formScore).toBeGreaterThanOrEqual(0);
        expect(metrics.formScore).toBeLessThanOrEqual(100);
      }

      // Check summary extraction
      const summary = rule.getSummary();
      expect(summary.exerciseId).toBe(exerciseId);
      expect(summary.exerciseName).toBe(rule.name);
    });
  });

  it('detects knee valgus fault in back squat when fault simulated', () => {
    const squatRule = createExerciseRule('back_squat');
    const calib = generateKinematicSkeleton('back_squat', 0.0, 1000);
    const baseline = squatRule.calibrate(calib);

    let valgusAlertTriggered = false;
    for (let step = 0; step <= 30; step++) {
      const progress = (step % 15) / 15;
      const timestampMs = 1000 + step * 80;
      // Inject knee valgus collapse fault
      const skeleton = generateKinematicSkeleton('back_squat', progress, timestampMs, 'valgus');

      const metrics = squatRule.evaluateFrame(skeleton, baseline, timestampMs);
      if (metrics.activeAlerts.some(a => a.id === 'knee_valgus')) {
        valgusAlertTriggered = true;
      }
    }

    expect(valgusAlertTriggered).toBe(true);
  });

  it('detects lumbar rounding fault in deadlift when fault simulated', () => {
    const deadliftRule = createExerciseRule('deadlift');
    const calib = generateKinematicSkeleton('deadlift', 0.0, 1000);
    const baseline = deadliftRule.calibrate(calib);

    let roundingAlertTriggered = false;
    for (let step = 0; step <= 30; step++) {
      const progress = (step % 15) / 15;
      const timestampMs = 1000 + step * 80;
      // Inject lumbar flexion rounding fault
      const skeleton = generateKinematicSkeleton('deadlift', progress, timestampMs, 'rounding');

      const metrics = deadliftRule.evaluateFrame(skeleton, baseline, timestampMs);
      if (metrics.activeAlerts.some(a => a.id === 'lumbar_rounding')) {
        roundingAlertTriggered = true;
      }
    }

    expect(roundingAlertTriggered).toBe(true);
  });
});
