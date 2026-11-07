# PoseCraft Architecture

PoseCraft is an on-device computer vision engine for human movement analysis and repetition tracking. The system runs directly in modern web browsers using WebGPU, WebAssembly, and React 19.

## Processing Pipeline

The frame pipeline runs at up to 60 frames per second without sending video data to external servers.

```
[ Camera Stream / Video Upload / Synthetic Kinematic Stream ]
                           │
                           ▼
             [ MediaPipe Pose Landmarker ]
                 (33 3D Joint Points)
                           │
                           ▼
          [ 1D / Multi-Dim Kalman Jitter Filter ]
                           │
                           ▼
         [ Anatomical Scale-Invariant Normalizer ]
           (Calculates torso, limb scale vectors)
                           │
                           ▼
             [ Modular Exercise Rule Engine ]
        (Evaluates joint angles, bar path, form faults)
                           │
                           ▼
         [ Dual-Threshold Hysteresis State Machine ]
      (Armed -> Concentric -> Peak -> Eccentric -> Rep Count)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  [ 60 FPS Canvas HUD Overlay ]  [ Real-Time Telemetry & Audio ]
  (Joint arcs, bone colors,      (Rep cadence, ROM scoring,
   dynamic trajectory lines)      synthesized safety alarms)
```

## Core Modules

### 1. Pose Detection Layer (`src/engine/detector.ts`)
The detector interface wraps MediaPipe Vision Tasks PoseLandmarker with GPU delegate support. It also includes an offline kinematic stream synthesizer that generates anatomically valid 33-point coordinates for automated test validation and headless benchmarks.

### 2. Geometry Engine (`src/engine/geometry.ts`)
Calculates three-point joint angles in two and three dimensions using Euclidean dot products. Computes:
- Joint flexion and extension angles
- Vector collinearity deviations (for spinal alignment and body plank tests)
- Segment distance normalization relative to torso length
- Frontal plane displacement for knee valgus detection

### 3. Kalman Filter (`src/engine/kalman.ts`)
Applies linear recursive state estimation over landmark coordinates. It filters high-frequency sensor jitter caused by low webcam shutter speeds while retaining fast movement transients during explosive concentric phases.

### 4. Scale Invariance (`src/engine/normalizer.ts`)
Extracts anatomical baseline dimensions from the user:
- Torso length: distance between shoulder midpoint and hip midpoint
- Bi-acromial diameter: shoulder width
- Femur and tibia lengths: thigh and shin segments

Normalized measurements are expressed as dimensionless ratios of torso length ($L_{\text{torso}}$), ensuring uniform scoring whether the user is 1.5 meters or 4 meters away from the lens.

### 5. Repetition State Machine (`src/engine/state_machine.ts`)
Uses dual-threshold hysteresis to prevent false repetition counts caused by muscle tremor, pause holds, or slight reversals in trajectory. A repetition must cross the entry threshold into concentric motion, clear the peak threshold (valid ROM), and cross the return threshold into full extension to be registered.

### 6. Tactile Audio Synthesizer (`src/engine/audio.ts`)
Generates low-latency tones using the Web Audio API without loading external MP3 files:
- 880 Hz sine chime for completed repetitions
- 220 Hz sawtooth pulse for form violations (lumbar rounding, knee collapse)
- 440 Hz tick metronome for cadence pacing
