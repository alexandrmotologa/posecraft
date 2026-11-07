<p align="center">
  <img src="docs/images/logo.png?raw=true" alt="PoseCraft Logo" width="130" style="border-radius: 24px;" />
</p>

<h1 align="center">PoseCraft</h1>

<p align="center">
  <strong>Local Biomechanical Movement Lab & Repetition Engine</strong><br />
  Runs 100% on-device via WebGPU, WebAssembly, MediaPipe Pose (33 3D Joints), and React 19.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-WebGPU%20%2F%20Wasm-00f5ff?style=flat-square" alt="WebGPU Runtime" />
  <img src="https://img.shields.io/badge/Pose%20Model-MediaPipe%2033%20Joints-0284c7?style=flat-square" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-3b82f6?style=flat-square" alt="React 19" />
  <img src="https://img.shields.io/badge/Privacy-Zero%20Cloud%20Uploads-10b981?style=flat-square" alt="Zero Cloud Uploads" />
  <img src="https://img.shields.io/badge/Tests-55%20Passing-emerald?style=flat-square" alt="Tests 55 Passing" />
  <img src="https://img.shields.io/badge/License-MIT-slate?style=flat-square" alt="License MIT" />
</p>

<p align="center">
  <img src="docs/images/posecraft_demo.gif?raw=true" alt="PoseCraft Biomechanical Movement Engine Live Demonstration" width="100%" style="border-radius: 14px; border: 1px solid #1e293b;" />
</p>

PoseCraft is a client-side biomechanical movement analysis laboratory and repetition tracking engine. It operates directly inside modern web browsers with zero external network transmission of camera feeds or video streams.

## Key Capabilities

- **28 Biomechanical Modules Across 6 Suites**: Calisthenics, Barbell & Hypertrophy, Unilateral & Lower Body, Conditioning, Athletic Power, and Kinetotherapy / Mobility.
- **Anatomical Scale Invariance**: Normalizes all linear metrics against the user's torso length and limb baselines. Measurements stay accurate across different camera distances.
- **Dual-Threshold Repetition State Machine**: Uses hysteresis to prevent double counting from muscle tremor or pause points.
- **Adaptive Kalman Jitter Filtering**: Smooths 33 anatomical landmark coordinates in real time while preserving high-speed concentric movement spikes.
- **Real-Time Canvas HUD at 60 FPS**: Renders joint angle dials, color-coded bone stress lines, bar path tracers with vertical corridors, and form violation banners.
- **Synthesized Voice & Audio Coach**: Delivers spoken coaching cues ("Knees out", "Chest up", "Squeeze glutes"), rep count announcements, and Web Audio chimes with zero cloud dependencies.
- **Audio Metronome & Tempo Pacer**: Web Audio synthesizer pacing repetitions across eccentric, isometric pause, and concentric phases (e.g. 3-1-1-0 or 2-0-2-0).
- **Interactive 3-Point Angle Protractor**: Click any 3 arbitrary points directly on the canvas to measure joint angles and inclinations.
- **Video Scrubbing & Slow-Motion**: Frame-by-frame stepping (-0.033s / +0.033s, arrow keys) and playback speed controls (0.25x, 0.5x, 1.0x).
- **Real-Time Kinematic Waveform**: Plots instantaneous joint displacement and tracks peak movement velocity in real time.
- **Local Storage History & Raw CSV Export**: Persists workout sets locally in browser storage and enables one-click raw CSV telemetry export.
- **Report & Video Export**: WebCodecs and MediaRecorder MP4/WebM export with burned-in telemetry HUD and printable biomechanical athlete summaries.

## Supported Exercise Catalog

| Suite | Modules | Key Biomechanical Metrics |
| :--- | :--- | :--- |
| **Calisthenics & Bodyweight** | Pull-Ups, Push-Ups, Dips, Isometric Plank, L-Sit / Leg Raises, Handstand Hold | Dead hang lockout, chin clearance, trunk collinearity, smart isometric timer |
| **Barbell & Hypertrophy** | Back Squat, Deadlift, Bench Press, Overhead Press, Barbell Row, Bicep Curls, Lateral Raises | Femur-tibia depth angle, lumbar curvature alert, elbow flare, cheating detector |
| **Unilateral & Symmetry** | Walking Lunges, Bulgarian Split Squat, Single-Leg RDL, Calf Raises | Left versus right ROM matrix, frontal knee valgus index, pelvic tilt detector |
| **Conditioning & Functional** | Kettlebell Swings, Burpees, Jump Rope, Boxing Shadow & Guard | Hip hinge versus squat classifier, cadence (RPM), ground contact time, guard check |
| **Athletic Performance** | Countermovement Vertical Jump, Running Gait Cadence, Standing Broad Jump | Airborne flight time height formula, takeoff velocity, stride impact angle |
| **Kinetotherapy & Rehab** | FMS Overhead Squat, Shoulder Mobility (Apley), Desk Posture Sentinel, 30s Sit-to-Stand | Functional movement screen score, craniovertebral angle (tech neck), fall risk index |

## Studio Interface & Telemetry

### Real-Time Biomechanical Movement Studio
![PoseCraft Desktop Dashboard](docs/images/posecraft_desktop_dashboard.png?raw=true)

### Clinical Athlete Report & Mobile Responsive Design
<p align="center">
  <img src="docs/images/posecraft_report_modal.png?raw=true" alt="Athlete Assessment Report" width="62%" style="border-radius: 12px; vertical-align: top; margin-right: 2%;" />
  <img src="docs/images/posecraft_mobile.png?raw=true" alt="PoseCraft Mobile Responsive Interface" width="34%" style="border-radius: 12px; vertical-align: top;" />
</p>

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
