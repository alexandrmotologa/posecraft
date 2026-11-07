import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vbtEngine, VbtRepetitionData } from '../src/engine/vbt';
import { centerOfMassEngine } from '../src/engine/com';
import { ATHLETE_PROFILES, AthleteLevelTier } from '../src/engine/athlete_level';
import { PRESET_ROUTINES, WorkoutRoutine } from '../src/engine/routine';
import { VoiceCommander } from '../src/engine/voice_commander';
import { CountdownTimer, CountdownState } from '../src/engine/countdown';
import { Landmark, RepetitionEvent } from '../src/engine/types';

describe('Advanced Features: VBT, CoM, Athlete Tiers, Routines, Voice & Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vbtEngine.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('VBT Engine (Velocity-Based Training)', () => {
    it('initializes with empty history and default state', () => {
      expect(vbtEngine.getHistory()).toHaveLength(0);
      expect(vbtEngine.getAverageVelocity()).toBe(0);
      expect(vbtEngine.getMaxVelocityLoss()).toBe(0);
    });

    it('correctly calculates Mean Concentric Velocity and classifies velocity zones', () => {
      // Rep 1: fast concentric duration 500ms
      const mockRep1: RepetitionEvent = {
        repNumber: 1,
        concentricMs: 500,
        eccentricMs: 1500,
        pauseMs: 200,
        peakRom: 75,
        romScore: 98,
        passed: true,
        infractions: [],
        repDurationMs: 2200,
      };

      // Displacement = 1.78 * 0.38 = 0.6764m -> velocity = 0.6764 / 0.5 = 1.35 m/s -> hyper_speed
      const vbt1: VbtRepetitionData = vbtEngine.evaluateRepetition(mockRep1, 1.78);
      expect(vbt1.meanConcentricVelocity).toBeGreaterThan(1.0);
      expect(vbt1.zone).toBe('hyper_speed');
      expect(vbt1.velocityLossPercent).toBe(0);
      expect(vbt1.fatigueWarning).toBe(false);

      // Rep 2: slower concentric duration 1200ms -> significant velocity loss
      const mockRep2: RepetitionEvent = {
        ...mockRep1,
        repNumber: 2,
        concentricMs: 1200,
      };

      const vbt2: VbtRepetitionData = vbtEngine.evaluateRepetition(mockRep2, 1.78);
      expect(vbt2.meanConcentricVelocity).toBeLessThan(vbt1.meanConcentricVelocity);
      expect(vbt2.velocityLossPercent).toBeGreaterThan(50);
      expect(vbt2.fatigueWarning).toBe(true);

      expect(vbtEngine.getHistory()).toHaveLength(2);
      expect(vbtEngine.getMaxVelocityLoss()).toBe(vbt2.velocityLossPercent);
    });

    it('customizes velocity loss limit threshold', () => {
      vbtEngine.setVelocityLossLimit(10);
      const mockRep: RepetitionEvent = {
        repNumber: 1,
        concentricMs: 800,
        eccentricMs: 1200,
        pauseMs: 0,
        peakRom: 80,
        romScore: 95,
        passed: true,
        infractions: [],
        repDurationMs: 2000,
      };
      vbtEngine.evaluateRepetition(mockRep);
      // second rep with 15% drop
      const mockRep2: RepetitionEvent = { ...mockRep, repNumber: 2, concentricMs: 950 };
      const res = vbtEngine.evaluateRepetition(mockRep2);
      expect(res.velocityLossPercent).toBeGreaterThanOrEqual(10);
      expect(res.fatigueWarning).toBe(true);
    });
  });

  describe('Center of Mass & Ground Reaction Projection', () => {
    const createMockLandmarks = (): Landmark[] => {
      const list: Landmark[] = [];
      for (let i = 0; i < 33; i++) {
        list.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 });
      }
      // Configure ankle, heel, and toe landmarks
      list[27] = { x: 0.45, y: 0.88, z: 0, visibility: 0.99 }; // left ankle
      list[28] = { x: 0.55, y: 0.88, z: 0, visibility: 0.99 }; // right ankle
      list[29] = { x: 0.45, y: 0.92, z: 0, visibility: 0.99 }; // left heel
      list[30] = { x: 0.55, y: 0.92, z: 0, visibility: 0.99 }; // right heel
      list[31] = { x: 0.45, y: 0.96, z: 0, visibility: 0.99 }; // left foot index / toe
      list[32] = { x: 0.55, y: 0.96, z: 0, visibility: 0.99 }; // right foot index / toe
      return list;
    };

    it('computes whole-body center of mass and classifies midfoot balance', () => {
      const landmarks = createMockLandmarks();
      const res = centerOfMassEngine.calculateCoM(landmarks);
      expect(res).not.toBeNull();
      if (res) {
        expect(res.com.x).toBeCloseTo(0.5, 1);
        expect(res.baseOfSupport.midfootCenter.x).toBeCloseTo(0.5, 1);
        expect(res.balanceStatus).toBe('optimal');
      }
    });

    it('returns null for missing or invalid landmarks array', () => {
      expect(centerOfMassEngine.calculateCoM([])).toBeNull();
    });
  });

  describe('Athlete Level Tiers', () => {
    it('provides distinct configurations across all 4 tiers', () => {
      const tiers: AthleteLevelTier[] = ['rehab', 'beginner', 'intermediate', 'elite'];
      for (const tier of tiers) {
        const profile = ATHLETE_PROFILES[tier];
        expect(profile).toBeDefined();
        expect(profile.id).toBe(tier);
        expect(profile.title.length).toBeGreaterThan(0);
        expect(profile.valgusThreshold).toBeGreaterThan(0.7);
        expect(profile.asymmetryTolerancePercent).toBeGreaterThan(0);
      }

      expect(ATHLETE_PROFILES.elite.asymmetryTolerancePercent).toBe(5);
      expect(ATHLETE_PROFILES.rehab.asymmetryTolerancePercent).toBe(12);
      expect(ATHLETE_PROFILES.elite.strictTempoEnforced).toBe(true);
      expect(ATHLETE_PROFILES.beginner.strictTempoEnforced).toBe(false);
    });
  });

  describe('Workout Routines & Circuits', () => {
    it('contains preset multi-station protocols', () => {
      expect(PRESET_ROUTINES.length).toBeGreaterThanOrEqual(3);

      const hypertrophy = PRESET_ROUTINES.find((r) => r.id === 'lower_body_hypertrophy');
      expect(hypertrophy).toBeDefined();
      expect(hypertrophy?.exercises.length).toBe(3);
      expect(hypertrophy?.exercises[0].exerciseId).toBe('back_squat');
      expect(hypertrophy?.exercises[0].restSecondsBetweenSets).toBe(90);

      const fms = PRESET_ROUTINES.find((r) => r.id === 'fms_clinical_assessment');
      expect(fms).toBeDefined();
      expect(fms?.exercises.length).toBe(3);
    });
  });

  describe('Voice Commander Parsing', () => {
    let commander: VoiceCommander;

    beforeEach(() => {
      commander = new VoiceCommander();
    });

    it('correctly maps verbal phrases to actions', () => {
      const actions: string[] = [];
      commander.setOnCommand((cmd) => {
        actions.push(cmd.action);
      });

      commander.processTranscript('start set now', 0.95);
      expect(actions).toContain('start_set');

      commander.processTranscript('please stop set', 0.95);
      expect(actions).toContain('stop_set');

      commander.processTranscript('reset workout', 0.95);
      expect(actions).toContain('reset_workout');

      commander.processTranscript('open report summary', 0.95);
      expect(actions).toContain('open_report');

      commander.processTranscript('toggle fullscreen mode', 0.95);
      expect(actions).toContain('toggle_fullscreen');

      commander.processTranscript('mute sound please', 0.95);
      expect(actions).toContain('toggle_mute');
    });
  });

  describe('Countdown Timer', () => {
    it('progresses through 5-second countdown with ticks and completion', () => {
      const timer = new CountdownTimer();
      const ticks: number[] = [];
      let completed = false;

      timer.setOnTick((state: CountdownState) => {
        ticks.push(state.secondsRemaining);
      });

      timer.start(5, () => {
        completed = true;
      });

      expect(ticks[0]).toBe(5);

      vi.advanceTimersByTime(1000);
      expect(ticks).toContain(4);

      vi.advanceTimersByTime(4000);
      expect(completed).toBe(true);
      expect(timer.getState().isActive).toBe(false);
    });

    it('can be cancelled midway', () => {
      const timer = new CountdownTimer();
      timer.start(5, () => {});
      expect(timer.getState().isActive).toBe(true);

      vi.advanceTimersByTime(1500);
      timer.cancel();
      expect(timer.getState().isActive).toBe(false);
    });
  });
});
