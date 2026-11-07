import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TempoMetronome } from '../src/engine/metronome';
import { CustomProtractor } from '../src/components/canvas/CustomProtractor';
import { VoiceCoach } from '../src/engine/voice_coach';

describe('Enhancements Suite: Metronome, Protractor & Voice Coach', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('TempoMetronome', () => {
    it('initializes with default 3-1-1-0 configuration', () => {
      const metronome = new TempoMetronome({
        eccentricSeconds: 3,
        pauseBottomSeconds: 1,
        concentricSeconds: 1,
        pauseTopSeconds: 0,
      });

      expect(metronome.getPhase()).toBe('eccentric');
      expect(metronome.getSecondsLeft()).toBe(3);
    });

    it('cycles through phases correctly on 1-1-1-1 tempo', () => {
      const ticks: { phase: string; seconds: number }[] = [];
      const metronome = new TempoMetronome({
        eccentricSeconds: 1,
        pauseBottomSeconds: 1,
        concentricSeconds: 1,
        pauseTopSeconds: 1,
      });

      metronome.setOnTick((phase, sec) => {
        ticks.push({ phase, seconds: sec });
      });

      metronome.start();

      // Tick 1s: eccentric ends, transitions to pause_bottom
      vi.advanceTimersByTime(1000);
      expect(metronome.getPhase()).toBe('pause_bottom');

      // Tick 2s: pause_bottom ends, transitions to concentric
      vi.advanceTimersByTime(1000);
      expect(metronome.getPhase()).toBe('concentric');

      // Tick 3s: concentric ends, transitions to pause_top
      vi.advanceTimersByTime(1000);
      expect(metronome.getPhase()).toBe('pause_top');

      // Tick 4s: pause_top ends, cycles back to eccentric
      vi.advanceTimersByTime(1000);
      expect(metronome.getPhase()).toBe('eccentric');

      metronome.stop();
    });

    it('skips zero-second phases gracefully', () => {
      const metronome = new TempoMetronome({
        eccentricSeconds: 2,
        pauseBottomSeconds: 0, // 0-second pause
        concentricSeconds: 1,
        pauseTopSeconds: 0, // 0-second pause
      });

      metronome.start();
      expect(metronome.getPhase()).toBe('eccentric');

      // 1s
      vi.advanceTimersByTime(1000);
      expect(metronome.getPhase()).toBe('eccentric');

      // 2s -> transitions directly to concentric (skipping pause_bottom)
      vi.advanceTimersByTime(1000);
      expect(metronome.getPhase()).toBe('concentric');

      // 3s -> transitions directly back to eccentric (skipping pause_top)
      vi.advanceTimersByTime(1000);
      expect(metronome.getPhase()).toBe('eccentric');

      metronome.stop();
    });
  });

  describe('CustomProtractor', () => {
    it('calculates right 90-degree angle between 3 points', () => {
      const protractor = new CustomProtractor();
      protractor.isActive = true;

      // Point A at (0, 0), Vertex B at (0, 1), Point C at (1, 1)
      protractor.addPoint({ x: 0, y: 0 });
      protractor.addPoint({ x: 0, y: 1 });
      protractor.addPoint({ x: 1, y: 1 });

      expect(protractor.pointsList.length).toBe(3);
      expect(protractor.angleDegrees).not.toBeNull();
      expect(Math.round(protractor.angleDegrees!)).toBe(90);
    });

    it('calculates 180-degree straight angle between 3 points', () => {
      const protractor = new CustomProtractor();
      protractor.isActive = true;

      // Collinear: (0, 0) -> (0, 1) -> (0, 2)
      protractor.addPoint({ x: 0, y: 0 });
      protractor.addPoint({ x: 0, y: 1 });
      protractor.addPoint({ x: 0, y: 2 });

      expect(Math.round(protractor.angleDegrees!)).toBe(180);
    });

    it('clears points when reset', () => {
      const protractor = new CustomProtractor();
      protractor.addPoint({ x: 0, y: 0 });
      protractor.clear();

      expect(protractor.pointsList.length).toBe(0);
      expect(protractor.angleDegrees).toBeNull();
    });

    it('replaces first point when fourth point is clicked', () => {
      const protractor = new CustomProtractor();
      protractor.addPoint({ x: 1, y: 1 });
      protractor.addPoint({ x: 2, y: 2 });
      protractor.addPoint({ x: 3, y: 3 });
      expect(protractor.pointsList.length).toBe(3);

      protractor.addPoint({ x: 4, y: 4 });
      expect(protractor.pointsList.length).toBe(1);
      expect(protractor.pointsList[0]).toEqual({ x: 4, y: 4 });
    });
  });

  describe('VoiceCoach', () => {
    it('respects enabled and muted states', () => {
      const coach = new VoiceCoach();
      expect(coach.getEnabled()).toBe(true);

      coach.setEnabled(false);
      expect(coach.getEnabled()).toBe(false);

      coach.setEnabled(true);
      expect(coach.getEnabled()).toBe(true);
    });

    it('maps exercise alert cues correctly', () => {
      const coach = new VoiceCoach();
      expect(coach.cues['knee_valgus']).toBe('Knees out');
      expect(coach.cues['lumbar_rounding']).toBe('Straighten your back');
      expect(coach.cues['hip_sag']).toBe('Squeeze your core');
    });
  });
});
