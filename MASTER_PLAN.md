# PoseCraft: Architecture & Engineering Master Plan

> Local Biomechanical Movement Lab, Form Analyzer & Real-Time Repetition Engine
> Client-Side Computer Vision via WebGPU, WebAssembly, and React 19

---

## 1. Executive Summary & Problem Space

### Problem Space
Computer vision for athletics, resistance training, and physical therapy rehabilitation often suffers from three major flaws:
1. **Remote Cloud Latency and Privacy Concerns**: Cloud-based services upload private user workout video feeds over the network, introducing round-trip latency, bandwidth cost, and privacy exposure.
2. **Batch Processing Delays**: Traditional Python scripts (using OpenCV or Gradio) frequently process video clips offline in batch mode, taking 40 to 90 seconds per set with zero immediate feedback for the athlete during the lift.
3. **Rigid Pixel Coordinates**: Uncalibrated tools measure pixel distances directly, failing as soon as an athlete moves closer to or farther from the camera lens.

### The Solution: PoseCraft
PoseCraft is an on-device biomechanical movement analysis studio and repetition counter. Powered by WebGPU and WebAssembly pose inference running directly in the browser, PoseCraft evaluates 33 full-body anatomical landmark coordinates at 60 FPS with zero cloud dependencies.

All measurements are scale-invariant, normalized against the user's anatomical torso length ($L_{\text{torso}}$) and segment dimensions. The engine evaluates Range of Motion (ROM), detects hazardous form deviations (lumbar rounding, knee valgus collapse, kipping, forward head angle), counts repetitions using dual-threshold hysteresis, tracks concentric and eccentric tempo, and exports branded video reviews and session reports.

---

## 2. System Architecture & Frame Pipeline

```
[ Input: Live Camera (60 FPS) / Video Upload (.mp4, .mov, .webm) / Kinematic Stream ]
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           PoseCraft Core Pipeline                             │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ WebGPU / WebAssembly Neural Pose Detector                               │  │
│  │ - 33 3D Anatomical Landmarks (x, y, z, visibility, presence)            │  │
│  │ - Built-in Kinematic Stream Synthesizer for zero-hardware verification  │  │
│  └─────────────────────────────────────┬───────────────────────────────────┘  │
│                                        │ Raw Landmarks                        │
│                                        ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Anatomical Normalizer & Adaptive Kalman Jitter Filter                   │  │
│  │ - Torso scale vector: L_torso = ||MidShoulder - MidHip||                │  │
│  │ - Invariant normalization: y_norm = (y - y_ref) / L_torso               │  │
│  │ - Recursive state smoothing: reduces sensor jitter without phase lag    │  │
│  └─────────────────────────────────────┬───────────────────────────────────┘  │
│                                        │ Clean Normalized Landmarks           │
│                                        ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Modular Exercise Engine (28 Pluggable Rules across 6 Suites)            │  │
│  │  1. Calisthenics: Pull-ups, Push-ups, Dips, Plank, L-sit, Handstand     │  │
│  │  2. Barbell & Hypertrophy: Squat, Deadlift, Bench, OHP, Row, Curl, Raise│  │
│  │  3. Unilateral & Symmetry: Lunges, Bulgarian, Single RDL, Calf Raises   │  │
│  │  4. Conditioning: Kettlebell Swing, Burpees, Jump Rope, Boxing Shadow   │  │
│  │  5. Athletic & Power: Vertical Jump, Running Gait, Broad Jump           │  │
│  │  6. Rehab & Screen: FMS Overhead Squat, Shoulder Mobility, CVA, Sit-Stand│
│  └─────────────────────────────────────┬───────────────────────────────────┘  │
│                                        │ Frame Metrics & Safety Verdict       │
│                                        ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Repetition State Machine with Dual-Threshold Hysteresis                 │  │
│  │ (IDLE -> ARMED -> CONCENTRIC -> PEAK -> ECCENTRIC -> COMPLETED)         │  │
│  │ Eliminates double counting and measures concentric/eccentric tempo      │  │
│  └─────────────────────────────────────┬───────────────────────────────────┘  │
│                                        │                                      │
│         ┌──────────────────────────────┴─────────────────────────────┐        │
│         ▼                                                            ▼        │
│  ┌──────────────────────────────────────────┐    ┌─────────────────────────┐  │
│  │ 60 FPS Canvas HUD Overlay                │    │ Real-Time Telemetry &   │  │
│  │ - Color-coded skeleton (Green/Amber/Red) │    │ Synthesized Audio       │  │
│  │ - Joint angle dials with dynamic arcs    │    │ - Rep cadence & score   │  │
│  │ - Trajectory path & reference ghost      │    │ - Audio rep chimes      │  │
│  │ - Real-time safety warning HUD banner    │    │ - Hazard warning pulses │  │
│  └──────────────────────────────────────────┘    └─────────────────────────┘  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ Export Engine: 1-Click Video Recording with HUD + Athlete Session Card │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive 28-Module Exercise Catalog

Every module implements the strict TypeScript `ExerciseRule` contract:

```typescript
export interface ExerciseRule {
  id: string;
  name: string;
  category: ExerciseCategory;
  cameraPerspective: 'side_profile' | 'front_facing' | 'any';
  targetJoints: JointType[];
  calibrate(skeleton: Skeleton): UserBaseline;
  evaluateFrame(skeleton: Skeleton, baseline: UserBaseline, timestampMs: number): FrameMetrics;
  detectRepState(history: FrameMetrics[], currentState: RepState): RepTransition;
  validateSafety(metrics: FrameMetrics): SafetyVerdict;
  getSummary(repHistory: RepetitionEvent[]): ExerciseSummary;
}
```

### Suite 1: Calisthenics & Bodyweight (6 Modules)
1. `pull_ups`: Dead hang elbow lockout (>160 degrees), chin clearing bar height by at least 0.15 of torso length, kipping knee swing detection.
2. `push_ups`: Lockout at 165 degrees, bottom chest depth (elbow angle <= 90 degrees), hip sag and pike detection.
3. `dips`: Bottom depth (elbow angle <= 90 degrees), top lockout, anterior shoulder dump warning.
4. `plank`: Collinearity along ankle, knee, hip, shoulder (180 +/- 8 degrees), smart timer with pause on form drop.
5. `l_sit`: Hip flexion angle <= 90 degrees, knee extension >= 170 degrees, floor clearance verification.
6. `handstand`: Vertical balance line across wrist, shoulder, hip, and ankle (180 +/- 6 degrees), banana back detection.

### Suite 2: Barbell & Gym Hypertrophy (7 Modules)
7. `back_squat`: Femur-tibia depth angle < 90 degrees, vertical bar trajectory over midfoot, knee valgus collapse alert.
8. `deadlift`: Full hip lockout, vertical bar path, lumbar curvature alert (delta theta spine > 20 degrees triggers warning alarm).
9. `bench_press`: Lower sternum touch point, full lockout, elbow flare protection (warning when elbow-to-rib angle exceeds 75 degrees), left/right press symmetry.
10. `overhead_press`: Full overhead lockout (180 degrees), head clearing window, lumbar hyperextension warning.
11. `barbell_row`: Torso angle maintenance between 15 and 45 degrees, elbow drive past ribs, cheating momentum detection.
12. `bicep_curls`: Full bottom extension (>160 degrees), peak flexion (<50 degrees), cheating detector penalizing forward elbow drift (>8 cm) and torso sway.
13. `lateral_raises`: Dumbbell horizontal abduction (80 to 90 degrees), trapezius shrugging compensation filter.

### Suite 3: Unilateral & Lower Body Symmetry (4 Modules)
14. `walking_lunges`: 90-degree front and rear knee angles, vertical torso tracking, front knee valgus check.
15. `bulgarian_squat`: Left versus right symmetry matrix comparing ROM depth and concentric tempo, knee valgus collapse detection.
16. `single_leg_rdl`: Hip hinge depth with soft knee, trailing leg alignment, pelvic rotation detector (flags hips twisting open).
17. `calf_raises`: Plantarflexion peak height relative to ankle baseline, 1.0s top isometric hold requirement, knee bounce cheat filter.

### Suite 4: Conditioning & Functional Fitness (4 Modules)
18. `kettlebell_swing`: Hip hinge versus squat swing classifier (hinge depth ratio), explosive hip extension lockout.
19. `burpees`: Full chest-to-floor touch, vertical extension with overhead clap at jump apex.
20. `jump_rope`: Jump cadence (RPM), ground contact time, bilateral landing symmetry.
21. `boxing_shadow`: Guard check (hands at chin level), punch extension on jab/cross, head slip tracking.

### Suite 5: Athletic Performance & Power (3 Modules)
22. `vertical_jump`: Countermovement jump flight time height calculation:
    $$h = \frac{1}{8} g \cdot t_{\text{air}}^2 \approx 1.2258 \cdot t_{\text{air}}^2 \text{ (meters)}$$
23. `running_gait`: Cadence (steps per minute), foot strike ground angle, overstriding detection.
24. `broad_jump`: Horizontal takeoff angle (~45 degrees), horizontal displacement, landing knee flexion impact absorption.

### Suite 6: Kinetotherapy, Mobility & Ergonomics (4 Modules)
25. `fms_overhead_squat`: Clinical Functional Movement Screen standard. Overhead arm torso parallelism, heel contact, knee tracking.
26. `shoulder_mobility`: Apley Scratch test reach. Distance between fists behind back normalized by hand length.
27. `desk_posture`: Craniovertebral Angle (CVA) monitoring forward head posture (tech neck), desk slouch timer and alerts.
28. `sit_to_stand`: 30-second functional chair stand test for lower extremity power and fall risk assessment.

---

## 4. Value-Add Enhancements Integrated Into Core

1. **Synthetic Kinematic Stream Engine**:
   - Generates mathematically realistic 33-point landmark trajectories for every exercise.
   - Enables instant demonstration, unit testing, and full UI verification even on machines without a camera or sample video.

2. **Camera Perspective Sentinel**:
   - Compares shoulder-to-shoulder width against shoulder-to-hip depth.
   - Automatically detects if user is in sagittal (side) or frontal view and warns if the active exercise requires a different perspective.

3. **Multi-Tone Audio Synthesizer**:
   - Built on Web Audio API oscillators.
   - Clean rep completion tones, safety violation warnings, and metronome pacing without external asset downloads.

4. **Biomechanical Session Card & Report**:
   - Form score calculation (0-100), ROM grade distribution, tempo metrics, and safety flags.
   - Downloadable as printable summary card and JSON/CSV raw telemetry.

5. **Video Recording with Burned-In Telemetry HUD**:
   - Records live or uploaded video with skeleton and telemetry overlays using MediaRecorder and Canvas streams.

---

## 5. Implementation Tasks

- [x] Phase 0: GitHub Repository, Portfolio Sync & Documentation Setup
- [ ] Phase 1: Core Biomechanical Engine & Math
  - [ ] `src/engine/types.ts`: Landmark, Skeleton, ExerciseRule, FrameMetrics, RepetitionEvent.
  - [ ] `src/engine/geometry.ts`: 2D/3D joint angles, collinearity, vector distances, projections.
  - [ ] `src/engine/kalman.ts`: 1D and multi-dimensional adaptive Kalman filter.
  - [ ] `src/engine/normalizer.ts`: Scale-invariant anatomical normalizer.
  - [ ] `src/engine/state_machine.ts`: Dual-threshold hysteresis rep state machine.
  - [ ] `src/engine/audio.ts`: Synthesized Web Audio feedback engine.
  - [ ] `src/engine/detector.ts`: Pose landmarker interface + synthetic kinematic stream generator.
  - [ ] `tests/geometry.test.ts`: Comprehensive math test suite.
  - [ ] `tests/state_machine.test.ts`: Hysteresis and tempo test suite.
- [ ] Phase 2: Complete 28-Module Exercise Catalog
  - [ ] `src/exercises/calisthenics/`: pull_ups, push_ups, dips, plank, l_sit, handstand.
  - [ ] `src/exercises/barbell/`: back_squat, deadlift, bench_press, overhead_press, barbell_row, bicep_curls, lateral_raises.
  - [ ] `src/exercises/unilateral/`: walking_lunges, bulgarian_squat, single_leg_rdl, calf_raises.
  - [ ] `src/exercises/conditioning/`: kettlebell_swing, burpees, jump_rope, boxing_shadow.
  - [ ] `src/exercises/athletic/`: vertical_jump, running_gait, broad_jump.
  - [ ] `src/exercises/rehab/`: fms_overhead_squat, shoulder_mobility, desk_posture, sit_to_stand.
  - [ ] `src/exercises/registry.ts`: Unified registry, lookup, and suite categorization.
  - [ ] `tests/exercises.test.ts`: Verification of all 28 modules against synthetic kinematic frames.
- [ ] Phase 3: High-Performance Canvas Rendering HUD
  - [ ] `src/components/canvas/SkeletonPainter.ts`: 60 FPS bone rendering with safety color grading.
  - [ ] `src/components/canvas/AngleDial.ts`: Joint vertex angle arc gauges.
  - [ ] `src/components/canvas/PathTracer.ts`: Bar path and limb trajectory visualizer.
  - [ ] `src/components/canvas/VideoCanvas.tsx`: Primary video and canvas overlay component.
- [ ] Phase 4: Telemetry, Studio Controls & Audio HUD
  - [ ] `src/components/telemetry/MetricsDashboard.tsx`: Rep counter, tempo, ROM score, symmetry matrix.
  - [ ] `src/components/telemetry/SafetyAlertBanner.tsx`: Instant visual warnings with audio triggers.
  - [ ] `src/components/telemetry/DisplacementChart.tsx`: Real-time displacement curve canvas.
  - [ ] `src/components/studio/ExerciseSelector.tsx`: Suite browser with camera perspective pills.
  - [ ] `src/components/studio/CameraSelector.tsx`: Webcam, video upload, and synthetic stream controls.
- [ ] Phase 5: Export Pipeline, Session Report & Verification
  - [ ] `src/components/export/SessionReportModal.tsx`: Biomechanical athlete score card.
  - [ ] `src/components/export/VideoRecorder.ts`: MediaRecorder HUD video capture.
  - [ ] Complete end-to-end verification and production build.
