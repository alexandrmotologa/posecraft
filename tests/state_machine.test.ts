import { describe, it, expect, beforeEach } from 'vitest';
import { RepetitionStateMachine, IsometricStateMachine } from '../src/engine/state_machine';

describe('Repetition State Machine: Dual-Threshold Hysteresis', () => {
  let squatSM: RepetitionStateMachine;

  beforeEach(() => {
    squatSM = new RepetitionStateMachine({
      startThreshold: 170, // standing lockout
      inflectionThreshold: 140, // breaking at the hips/knees
      peakRomThreshold: 85, // below parallel depth
      isDescendingPhase: true,
      minRepDurationMs: 300,
      hysteresisBuffer: 4,
    });
  });

  it('progresses through states and completes a full valid squat repetition', () => {
    let t = 1000;

    // 1. Stand at lockout
    expect(squatSM.getState()).toBe('IDLE');
    squatSM.update(172, t);
    expect(squatSM.getState()).toBe('ARMED');

    // 2. Begin descent into concentric inflection
    t += 200;
    squatSM.update(135, t);
    expect(squatSM.getState()).toBe('CONCENTRIC');

    // 3. Reach bottom parallel depth
    t += 500;
    squatSM.update(80, t);
    expect(squatSM.getState()).toBe('PEAK');

    // 4. Begin ascent back up
    t += 400;
    squatSM.update(120, t);
    expect(squatSM.getState()).toBe('ECCENTRIC');

    // 5. Return to full lockout
    t += 400;
    const completedRep = squatSM.update(170, t);

    expect(completedRep).not.toBeNull();
    expect(completedRep?.repNumber).toBe(1);
    expect(completedRep?.peakRom).toBe(80);
    expect(completedRep?.romScore).toBeGreaterThanOrEqual(100);
    expect(completedRep?.passed).toBe(true);
    expect(squatSM.getRepCount()).toBe(1);
  });

  it('rejects partial depth repetition (does not reach peakRomThreshold)', () => {
    let t = 1000;
    squatSM.update(170, t); // ARMED
    t += 200;
    squatSM.update(130, t); // CONCENTRIC
    t += 300;
    squatSM.update(110, t); // Quits at 110 degrees (shallow squat, never hits 85)
    t += 300;
    const rep = squatSM.update(170, t); // Reverts back up

    // Should NOT complete a valid repetition because it never reached PEAK
    expect(rep).toBeNull();
    expect(squatSM.getRepCount()).toBe(0);
  });

  it('prevents double counting from jitter near thresholds', () => {
    let t = 1000;
    squatSM.update(170, t);
    t += 100;
    squatSM.update(168, t);
    t += 100;
    squatSM.update(171, t);
    t += 100;
    squatSM.update(169, t);

    // Minor tremor at lockout must remain in ARMED state without counting reps
    expect(squatSM.getState()).toBe('ARMED');
    expect(squatSM.getRepCount()).toBe(0);
  });
});

describe('Isometric State Machine: Smart Timer', () => {
  let plankSM: IsometricStateMachine;

  beforeEach(() => {
    plankSM = new IsometricStateMachine();
  });

  it('accumulates seconds only when form is valid', () => {
    let t = 1000;
    plankSM.update(true, t);

    // 3 seconds of perfect form
    t += 1000;
    plankSM.update(true, t);
    t += 1000;
    plankSM.update(true, t);
    t += 1000;
    const res1 = plankSM.update(true, t);
    expect(res1.activeSeconds).toBe(3);
    expect(res1.isHolding).toBe(true);

    // Form breakdown (hip sag) for 2 seconds
    t += 1000;
    plankSM.update(false, t);
    t += 1000;
    const res2 = plankSM.update(false, t);
    // Timer must not increase while form is compromised!
    expect(res2.activeSeconds).toBe(3);
    expect(res2.isHolding).toBe(false);

    // Resumes form
    t += 1000;
    const res3 = plankSM.update(true, t);
    expect(res3.activeSeconds).toBe(4);
    expect(res3.isHolding).toBe(true);
  });
});
