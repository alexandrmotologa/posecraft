import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Orbit3DEngine } from '../src/engine/orbit3d';
import { PathTracer } from '../src/components/canvas/PathTracer';
import { BiofeedbackSonificationEngine } from '../src/engine/sonification';
import {
  CustomExerciseManager,
  CustomExerciseRule,
  CustomExerciseDefinition,
} from '../src/engine/custom_exercise';
import { vbtEngine } from '../src/engine/vbt';
import { VoiceCommander } from '../src/engine/voice_commander';
import { generateTcxXml } from '../src/engine/tcx_exporter';
import { Landmark, LandmarkIndex, Skeleton } from '../src/engine/types';

describe('Advanced Engineering V2 Suite: 3D Orbit, Sonification, Sticking Points, Custom Studio, VBT RPE/1RM, Bilingual Voice & TCX', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vbtEngine.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('3D Orbit Skeleton Engine', () => {
    it('initializes with default camera and applies presets accurately', () => {
      const engine = new Orbit3DEngine();
      const initialCam = engine.getCamera();
      expect(initialCam.azimuthRad).toBe(0);
      expect(initialCam.zoom).toBe(140);

      // Sagittal Left preset: 90 degrees (PI/2) yaw
      engine.applyPreset('sagittal_left');
      expect(engine.getCamera().azimuthRad).toBeCloseTo(Math.PI / 2, 2);

      // Sagittal Right preset: -90 degrees (-PI/2) yaw
      engine.applyPreset('sagittal_right');
      expect(engine.getCamera().azimuthRad).toBeCloseTo(-Math.PI / 2, 2);

      // Reset
      engine.resetCamera();
      expect(engine.getCamera().azimuthRad).toBe(0);
    });

    it('projects 3D world coordinates (meters) to 2D canvas viewport coordinates', () => {
      const engine = new Orbit3DEngine();
      const worldPoint = { x: 0, y: 0.5, z: 0 };
      const proj = engine.projectPoint(worldPoint, 400, 400);

      expect(proj.x).toBeGreaterThan(0);
      expect(proj.x).toBeLessThan(400);
      expect(proj.y).toBeGreaterThan(0);
      expect(proj.y).toBeLessThan(400);
      expect(proj.depth).toBeDefined();
    });

    it('updates camera rotation and zoom smoothly within bounds', () => {
      const engine = new Orbit3DEngine();
      engine.rotate(0.5, 0.2);
      expect(engine.getCamera().azimuthRad).toBeCloseTo(0.5, 2);

      engine.zoom(50);
      expect(engine.getCamera().zoom).toBe(190);

      engine.zoom(-500); // clamps to minimum 50
      expect(engine.getCamera().zoom).toBe(50);
    });
  });

  describe('PathTracer with Velocity Heatmap & Sticking Point Detection', () => {
    it('detects a mechanical sticking point during concentric ascent deceleration', () => {
      const tracer = new PathTracer(50);
      tracer.setUserHeight(1.80);

      let t = 1000;
      // 1. Descending eccentric phase
      for (let i = 0; i < 5; i++) {
        tracer.addPoint({ x: 0.5, y: 0.3 + i * 0.05 }, t);
        t += 300;
      }

      // 2. Concentric ascent: rapid start, then a slow sticking point grind, then speedup
      tracer.addPoint({ x: 0.5, y: 0.55 }, t);
      t += 200;

      // Sticking point: travels tiny vertical distance over 800ms -> v < 0.30 m/s
      tracer.addPoint({ x: 0.5, y: 0.53 }, t + 800);
      t += 800;

      // Finish lockout
      tracer.addPoint({ x: 0.5, y: 0.30 }, t + 400);

      const sp = tracer.getStickingPoint();
      expect(sp).not.toBeNull();
      if (sp) {
        expect(sp.velocity).toBeLessThan(0.40);
        expect(sp.point.y).toBeCloseTo(0.53, 2);
      }
    });

    it('clears history and resets reference corridor', () => {
      const tracer = new PathTracer();
      tracer.addPoint({ x: 0.45, y: 0.5 }, 1000);
      tracer.clear();
      expect(tracer.getStickingPoint()).toBeNull();
    });
  });

  describe('Biofeedback Sonification Engine', () => {
    it('initializes in disabled state and toggles cleanly', () => {
      const sonify = new BiofeedbackSonificationEngine();
      expect(sonify.getIsEnabled()).toBe(false);

      sonify.setEnabled(true);
      expect(sonify.getIsEnabled()).toBe(true);

      sonify.silence();
      sonify.setEnabled(false);
      expect(sonify.getIsEnabled()).toBe(false);
    });
  });

  describe('Custom Exercise Studio & Dynamic Kinematic Rule', () => {
    const mockDef: CustomExerciseDefinition = {
      id: 'custom_bicep_curl_test',
      name: 'Custom Bicep Curl',
      category: 'barbell',
      description: 'Test bicep curl protocol',
      primaryJointName: 'Elbow',
      proximalLandmark: LandmarkIndex.LEFT_SHOULDER,
      vertexLandmark: LandmarkIndex.LEFT_ELBOW,
      distalLandmark: LandmarkIndex.LEFT_WRIST,
      startAngle: 160,
      inflectionAngle: 130,
      peakAngle: 55,
      isDescendingPhase: true,
      safetyChecks: {
        checkValgus: false,
        checkSpine: false,
      },
      createdAt: Date.now(),
    };

    it('executes repetition cycles on CustomExerciseRule instance', () => {
      const rule = new CustomExerciseRule(mockDef);
      expect(rule.id).toBe('custom_bicep_curl_test');
      expect(rule.primaryMetricLabel).toBe('Elbow ROM');

      const createSkeletonAtAngle = (angleDeg: number, timeMs: number): Skeleton => {
        const list: Landmark[] = [];
        for (let i = 0; i < 33; i++) list.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 });
        // Vertex at (0.5, 0.5)
        list[LandmarkIndex.LEFT_ELBOW] = { x: 0.5, y: 0.5, z: 0, visibility: 0.99 };
        // Shoulder straight down (0.5, 0.7) so BA vector is (0, +0.2)
        list[LandmarkIndex.LEFT_SHOULDER] = { x: 0.5, y: 0.7, z: 0, visibility: 0.99 };

        const rad = (angleDeg * Math.PI) / 180;
        // Wrist relative to elbow with specific angle
        list[LandmarkIndex.LEFT_WRIST] = {
          x: 0.5 + 0.2 * Math.sin(rad),
          y: 0.5 + 0.2 * Math.cos(rad),
          z: 0,
          visibility: 0.99,
        };

        return { landmarks: list, timestampMs: timeMs };
      };

      const base = rule.calibrate(createSkeletonAtAngle(160, 0));

      // 1. Start position at 160 deg
      const f1 = rule.evaluateFrame(createSkeletonAtAngle(160, 100), base, 100);
      expect(f1.repCount).toBe(0);

      // 2. Flex past inflection into peak (55 deg)
      rule.evaluateFrame(createSkeletonAtAngle(120, 400), base, 400);
      rule.evaluateFrame(createSkeletonAtAngle(50, 800), base, 800);

      // 3. Rise back up through eccentric return (100 deg at 1200ms)
      rule.evaluateFrame(createSkeletonAtAngle(100, 1200), base, 1200);

      // 4. Return to starting lockout (165 deg at 1600ms) -> triggers completed repetition
      const fCompleted = rule.evaluateFrame(createSkeletonAtAngle(165, 1600), base, 1600);
      expect(fCompleted.repCount).toBe(1);

      const summary = rule.getSummary();
      expect(summary.totalReps).toBe(1);
      expect(summary.validReps).toBe(1);
    });

    it('manages persistence and JSON import/export in CustomExerciseManager', () => {
      const manager = new CustomExerciseManager();
      manager.save(mockDef);

      const found = manager.getById(mockDef.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Custom Bicep Curl');

      const jsonStr = manager.exportJson();
      expect(jsonStr).toContain('custom_bicep_curl_test');

      const importedCount = manager.importJson(jsonStr);
      expect(importedCount).toBeGreaterThanOrEqual(1);

      manager.delete(mockDef.id);
      expect(manager.getById(mockDef.id)).toBeUndefined();
    });
  });

  describe('VBT RPE & 1RM Estimator Formulations', () => {
    it('accurately estimates RPE and Reps-in-Reserve from velocity loss %', () => {
      // 5% velocity loss -> Submaximal, RPE 7.5, 3 RIR
      const rpeLow = vbtEngine.calculateRpe(5, 0.85, 'back_squat');
      expect(rpeLow.rpe).toBe(7.5);
      expect(rpeLow.rir).toBe(3);

      // 12% velocity loss -> Hypertrophy sweet spot, RPE 8.0, 2 RIR
      const rpeMid = vbtEngine.calculateRpe(12, 0.70, 'back_squat');
      expect(rpeMid.rpe).toBe(8.0);
      expect(rpeMid.rir).toBe(2);

      // 22% velocity loss -> High exertion, RPE 9.0, 1 RIR
      const rpeHigh = vbtEngine.calculateRpe(22, 0.55, 'back_squat');
      expect(rpeHigh.rpe).toBe(9.0);
      expect(rpeHigh.rir).toBe(1);

      // 36% velocity loss -> Failure, RPE 10.0, 0 RIR
      const rpeMax = vbtEngine.calculateRpe(36, 0.32, 'back_squat');
      expect(rpeMax.rpe).toBe(10.0);
      expect(rpeMax.rir).toBe(0);
    });

    it('predicts dynamic 1RM using linear force-velocity profile', () => {
      // 100kg moved at 0.75 m/s (fast speed-strength tempo)
      const est1 = vbtEngine.calculateEstimated1Rm(100, 0.75, 'back_squat');
      expect(est1).toBeGreaterThan(110);
      expect(est1).toBeLessThan(130);

      // 100kg moved at near MVT 0.32 m/s -> estimated 1RM is ~101kg
      const est2 = vbtEngine.calculateEstimated1Rm(100, 0.32, 'back_squat');
      expect(est2).toBeCloseTo(101, -1);
    });
  });

  describe('Bilingual Romanian & English Voice Commander', () => {
    it('recognizes Romanian voice commands accurately', () => {
      const commander = new VoiceCommander();
      const actions: string[] = [];
      commander.setOnCommand((cmd) => actions.push(cmd.action));

      commander.processTranscript('pornește seria te rog', 0.95);
      expect(actions).toContain('start_set');

      commander.processTranscript('oprește seria acum', 0.95);
      expect(actions).toContain('stop_set');

      commander.processTranscript('resetare antrenament', 0.95);
      expect(actions).toContain('reset_workout');

      commander.processTranscript('arată raportul', 0.95);
      expect(actions).toContain('open_report');

      commander.processTranscript('ecran complet', 0.95);
      expect(actions).toContain('toggle_fullscreen');

      commander.processTranscript('sunet audio mut', 0.95);
      expect(actions).toContain('toggle_mute');

      commander.processTranscript('activează orbit 3d schelet', 0.95);
      expect(actions).toContain('toggle_orbit3d');

      commander.processTranscript('activează sonificare audio feed', 0.95);
      expect(actions).toContain('toggle_sonification');
    });

    it('switches recognition language smoothly', () => {
      const commander = new VoiceCommander();
      expect(commander.getLanguage()).toBe('en-US');
      commander.setLanguage('ro-RO');
      expect(commander.getLanguage()).toBe('ro-RO');
    });
  });

  describe('Standardized Garmin/Strava TCX Exporter', () => {
    it('generates schema-valid Training Center XML with laps, cadence, and watts', () => {
      const xml = generateTcxXml({
        id: 'session_test_123',
        timestamp: '2026-11-08T10:00:00.000Z',
        exerciseId: 'back_squat',
        exerciseName: 'Barbell Back Squat',
        totalReps: 5,
        validReps: 5,
        averageRom: 82,
        averageFormScore: 96,
        reps: [
          {
            repNumber: 1,
            startTimeMs: 1000,
            peakTimeMs: 1800,
            endTimeMs: 2500,
            durationMs: 1500,
            concentricMs: 700,
            eccentricMs: 800,
            peakRom: 82,
            romScore: 98,
            faults: [],
            passed: true,
            tempoString: '0.7s / 0.8s',
          },
        ],
      });

      expect(xml).toContain('<TrainingCenterDatabase');
      expect(xml).toContain('<Activity Sport="Other">');
      expect(xml).toContain('<Trackpoint>');
      expect(xml).toContain('<Cadence>');
      expect(xml).toContain('<Watts>');
      expect(xml).toContain('PoseCraft Biomechanical Lab');
    });
  });
});
