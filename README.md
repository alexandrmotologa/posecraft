# PoseCraft

Local biomechanical movement analysis and repetition tracking engine running in modern web browsers via WebGPU, WebAssembly, and React 19.

PoseCraft runs 100% on the client device. Video streams and camera feeds remain strictly local, with zero frames transmitted over the network.

## Key Capabilities

- **28 Biomechanical Modules Across 6 Suites**: Calisthenics, Barbell & Hypertrophy, Unilateral & Lower Body, Conditioning, Athletic Power, and Kinetotherapy / Mobility.
- **Anatomical Scale Invariance**: Normalizes all linear metrics against the user's torso length and limb baselines. Measurements stay accurate across different camera distances.
- **Dual-Threshold Repetition State Machine**: Uses hysteresis to prevent double counting from muscle tremor or pause points.
- **Adaptive Kalman Jitter Filtering**: Smooths 33 anatomical landmark coordinates in real time while preserving high-speed concentric movement spikes.
- **Real-Time Canvas HUD at 60 FPS**: Renders joint angle dials, color-coded bone stress lines, bar path tracers, and form violation banners.
- **Synthesized Audio Feedback**: Uses the Web Audio API to deliver rep completion chimes, safety warning pulses, and metronome pacing without external audio files.
- **Offline Video Analysis & Scrubbing**: Supports camera capture, video file upload (.mp4, .webm, .mov) with frame-by-frame scrubbing, and built-in synthetic exercise simulations.
- **Report & Video Export**: WebCodecs-based MP4 recorder with burned-in telemetry HUD and printable biomechanical athlete summaries.

## Supported Exercise Catalog

| Suite | Modules | Key Biomechanical Metrics |
| :--- | :--- | :--- |
| **Calisthenics & Bodyweight** | Pull-Ups, Push-Ups, Dips, Isometric Plank, L-Sit / Leg Raises, Handstand Hold | Dead hang lockout, chin clearance, trunk collinearity, smart isometric timer |
| **Barbell & Hypertrophy** | Back Squat, Deadlift, Bench Press, Overhead Press, Barbell Row, Bicep Curls, Lateral Raises | Femur-tibia depth angle, lumbar curvature alert, elbow flare, cheating detector |
| **Unilateral & Symmetry** | Walking Lunges, Bulgarian Split Squat, Single-Leg RDL, Calf Raises | Left versus right ROM matrix, frontal knee valgus index, pelvic tilt detector |
| **Conditioning & Functional** | Kettlebell Swings, Burpees, Jump Rope, Boxing Shadow & Guard | Hip hinge versus squat classifier, cadence (RPM), ground contact time, guard check |
| **Athletic Performance** | Countermovement Vertical Jump, Running Gait Cadence, Standing Broad Jump | Airborne flight time height formula, takeoff velocity, stride impact angle |
| **Kinetotherapy & Rehab** | FMS Overhead Squat, Shoulder Mobility (Apley), Desk Posture Sentinel, 30s Sit-to-Stand | Functional movement screen score, craniovertebral angle (tech neck), fall risk index |

## Architecture Overview

```
[ Input: Live Webcam / Video File / Synthetic Stream ]
                         │
                         ▼
          [ MediaPipe Pose Landmarker (33 Joints) ]
                         │
                         ▼
           [ Kalman Jitter Filter (1D / Multi-Dim) ]
                         │
                         ▼
         [ Scale-Invariant Anatomical Normalizer ]
                         │
                         ▼
          [ Modular Exercise Rule Engine (28 Rules) ]
                         │
                         ▼
        [ Dual-Threshold Hysteresis State Machine ]
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
[ 60 FPS Canvas HUD Overlay ]   [ Telemetry & Audio Synthesizer ]
(Bone colors, dynamic dials)    (Rep alerts, safety alarms, tempo)
```

## Mathematical Formulations

### Vector Joint Angle
Given three landmark points $A$, $B$, and $C$, where $B$ is the joint vertex:

$$\mathbf{u} = A - B, \quad \mathbf{v} = C - B$$
$$\theta = \arccos\left(\frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}\right) \times \frac{180^\circ}{\pi}$$

### Anatomical Normalization
Linear measurements are normalized by torso vector magnitude $L_{\text{torso}}$:

$$L_{\text{torso}} = \left\|\frac{S_L + S_R}{2} - \frac{H_L + H_R}{2}\right\|$$

### Flight Time Vertical Jump
Airborne flight duration $t_{\text{air}}$ from takeoff to landing determines jump height:

$$h = \frac{1}{8} g \cdot t_{\text{air}}^2 \approx 1.2258 \cdot t_{\text{air}}^2 \text{ (meters)}$$

### Spinal Curvature
Evaluates collinearity between the cervical base, mid-thoracic point, and sacrum:

$$\Delta\theta_{\text{spine}} = |180^\circ - \text{Angle}(\mathbf{s}_1, \mathbf{s}_2)|$$

Values above $22^\circ$ trigger an immediate lumbar rounding alert.

## Getting Started

### Prerequisites
- Node.js 20 or higher
- Modern Chromium or WebGPU-enabled browser

### Installation

```bash
git clone https://github.com/alexandrmotologa/posecraft.git
cd posecraft
npm install
```

### Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Running Tests

```bash
npm test
```

## Project Structure

```
posecraft/
├── docs/
│   ├── architecture.md          # Frame pipeline and component architecture
│   ├── biomechanics-spec.md     # Formulas, angles, and clinical thresholds
│   └── exercise-catalog.md      # Detailed breakdown of all 28 exercise modules
├── src/
│   ├── engine/                  # Core math, geometry, Kalman filter, and state machine
│   ├── exercises/               # 28 pluggable exercise modules across 6 suites
│   ├── components/              # Canvas HUD, telemetry, camera selector, and export modals
│   ├── hooks/                   # React hooks for pose pipeline and audio feedback
│   ├── store/                   # Workout session and telemetry store
│   ├── App.tsx                  # Studio layout and dashboard
│   └── main.tsx                 # React 19 entrypoint
├── tests/                       # Unit tests for geometry, state machine, and exercise rules
├── package.json
└── vite.config.ts
```

## Documentation

Detailed technical specifications are available in the `docs/` directory:
- [Architecture Details](docs/architecture.md)
- [Biomechanical Formulas and Thresholds](docs/biomechanics-spec.md)
- [Exercise Module Catalog](docs/exercise-catalog.md)

## License

MIT
