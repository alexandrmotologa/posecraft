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
  <img src="https://img.shields.io/badge/Tests-78%20Passing-emerald?style=flat-square" alt="Tests 78 Passing" />
  <img src="https://img.shields.io/badge/PWA-Offline%20Ready-blueviolet?style=flat-square" alt="PWA Ready" />
  <img src="https://img.shields.io/badge/License-MIT-slate?style=flat-square" alt="License MIT" />
</p>

<p align="center">
  <img src="docs/images/posecraft_demo.gif?raw=true" alt="PoseCraft Biomechanical Movement Engine Live Demonstration" width="100%" style="border-radius: 14px; border: 1px solid #1e293b;" />
</p>

PoseCraft is a client-side biomechanical movement analysis laboratory and repetition tracking engine. It operates directly inside modern web browsers with zero external network transmission of camera feeds or video streams.

## Key Capabilities

- **28 Biomechanical Modules Across 6 Suites**: Calisthenics, Barbell & Hypertrophy, Unilateral & Lower Body, Conditioning, Athletic Power, and Kinetotherapy / Mobility.
- **Interactive 3D Orbit Skeleton Viewport**: Projects 33 anatomical joints into 3D metric camera space using MediaPipe world landmarks. Supports mouse and touch drag rotation with Euler angles, wheel zoom, ground grid, coordinate gizmo, and anatomical camera presets (Frontal, Sagittal Left, Sagittal Right, Transverse Top).
- **Dynamic Velocity Bar Path Heatmap & Mechanical Sticking Points**: Real-time trajectory ribbon color-coded by concentric velocity (cyan > 0.85 m/s, green > 0.60 m/s, amber > 0.38 m/s, red < 0.38 m/s). Automatically detects and flags the exact sticking point coordinates where propulsion slows below 0.40 m/s.
- **Continuous Acoustic Biofeedback Sonification Engine**: Web Audio API FM synthesis graph that continuously modulates audio pitch (220 Hz to 660 Hz) based on concentric velocity. Triggers acoustic dissonance via a detuned tritone secondary oscillator when knee valgus collapse or lumbar flexion faults occur.
- **Visual No-Code Kinematic Exercise Studio**: Create custom exercise rules with interactive joint selector presets (Knee, Elbow, Hip, Shoulder), dual-threshold angle sliders with hysteresis, and safety check toggles. Persists custom exercises to local storage with JSON schema export and import.
- **Dual-View Side-by-Side Clinical Benchmark Comparison**: Split-screen interface comparing live repetitions against gold-standard clinical exercise models with synchronized phase scrubbing (0% to 100%), play/pause controls, and range of motion comparison tables.
- **VBT RPE Estimator, Reps-in-Reserve (RIR), and Dynamic 1RM Predictor**: Applies González-Badillo and Sánchez-Medina velocity profiles to predict 1RM and real-time RPE/RIR from mean concentric velocity and user-entered barbell load.
- **Bilingual Romanian and English Voice Commander**: Hands-free voice recognition with native command dictionaries for Romanian (ro-RO) and English (en-US), including commands for starting sets, pausing, resetting, reports, fullscreen, 3D orbit, and sonification.
- **Progressive Web App (PWA) Offline Architecture**: Service worker caching MediaPipe WebAssembly runtimes and assets with a CacheFirst strategy for full offline usability.
- **Standardized Garmin & Strava .TCX Exporter**: Generates schema-valid Training Center XML with per-repetition trackpoints, heart rate / cadence indicators, and estimated instantaneous power in watts.
- **Whole-Body Center of Mass (CoM) Projection**: Uses Dempster segmental mass distribution models across all 33 anatomical landmarks. Renders an active CoM reticle, vertical ground line, and midfoot base of support stability index.
- **Athlete Experience Profiles**: Adjusts valgus sensitivity, bilateral asymmetry tolerance (5% to 15%), and minimum depth across 4 tiers: Rehab / PT, Beginner, Intermediate, and Elite.
- **Multi-Exercise Routine & Circuit Builder**: Preset circuits with automated inter-set rest countdowns and station progression.
- **Printable Clinical Evaluation PDF Report**: Formatted clinical assessment documentation with print-optimized styling, joint range of motion charts, bilateral asymmetry analysis, and .TCX export integration.
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

### Clinical Athlete Reports & Mobile Responsive Interface
<p align="center">
  <img src="docs/images/posecraft_report_modal.png?raw=true" alt="Athlete Assessment Report" width="31%" style="border-radius: 12px; vertical-align: top; margin-right: 1.5%;" />
  <img src="docs/images/posecraft_clinical_print_modal.png?raw=true" alt="Printable Clinical Evaluation PDF Report" width="31%" style="border-radius: 12px; vertical-align: top; margin-right: 1.5%;" />
  <img src="docs/images/posecraft_mobile.png?raw=true" alt="PoseCraft Mobile Responsive Interface" width="31%" style="border-radius: 12px; vertical-align: top;" />
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

### Mean Concentric Velocity (VBT)
Calculates vertical barbell/body center velocity across the upward propulsion phase:

$$\bar{v}_{\text{concentric}} = \frac{\Delta y_{\text{displacement}}}{\Delta t_{\text{concentric}}}$$

Velocity loss relative to the fastest repetition in the current set:

$$\text{Loss}_{\%} = \frac{v_{\text{fastest}} - \bar{v}_{\text{rep}}}{v_{\text{fastest}}} \times 100\%$$

### Center of Mass (CoM) Projection
Calculates 2D center of mass using Dempster segment mass coefficients:

$$\mathbf{r}_{\text{CoM}} = \sum_{k=1}^{N} \mu_k \cdot \mathbf{r}_k$$

Where $\mu_{\text{trunk}} = 0.497$, $\mu_{\text{thighs}} = 0.200$, $\mu_{\text{shanks}} = 0.122$, $\mu_{\text{head}} = 0.081$, and limb segments comprise the remaining mass. Midfoot stability evaluates the horizontal offset between $\mathbf{r}_{\text{CoM}}$ and the midpoint of the heel-toe base of support.

### 3D Metric World Landmark Projection (Euler Orbit)
Projects MediaPipe metric 3D coordinates $(x, y, z)$ into screen coordinates $(u, v)$ via extrinsic rotation matrices $R_y(\alpha)$ (azimuth) and $R_x(\beta)$ (elevation) with perspective projection:

$$\mathbf{p}' = R_x(\beta) R_y(\alpha) (\mathbf{p} - \mathbf{c})$$
$$u = c_x + \frac{f \cdot x'}{d - z'}, \quad v = c_y - \frac{f \cdot y'}{d - z'}$$

Where $\mathbf{c}$ is the anatomical centroid, $f$ is focal length, and $d$ is camera viewing distance.

### Velocity-Based 1RM & RIR Estimation
Applies the González-Badillo & Sánchez-Medina second-order polynomial model mapping mean concentric velocity ($\bar{v}$) to percent 1RM ($\%1\text{RM}$):

$$\%1\text{RM} = -a \cdot \bar{v}^2 - b \cdot \bar{v} + c$$
$$\text{Estimated 1RM} = \frac{\text{Load}_{\text{kg}}}{\%1\text{RM} / 100}$$

Reps-in-Reserve (RIR) and Rating of Perceived Exertion (RPE) are derived from the delta between current concentric velocity $\bar{v}$ and the exercise minimal velocity threshold (MVT $\approx 0.30\text{ m/s}$):

$$\text{RPE} = 10 - \text{RIR}, \quad \text{RIR} = \text{clamp}\left(\left\lfloor \frac{\bar{v} - \text{MVT}}{0.075} \right\rfloor, 0, 5\right)$$

### FM Acoustic Sonification Graph
Concentric velocity dynamically modulates the carrier frequency $f_{\text{carrier}}$ of a Web Audio FM synthesizer graph:

$$f_{\text{carrier}}(t) = f_0 + (f_{\text{max}} - f_0) \cdot \text{clamp}\left(\frac{\bar{v}(t)}{v_{\text{threshold}}}, 0, 1\right)$$

When form violation alerts trigger (lumbar rounding or knee valgus collapse), a secondary oscillator introduces acoustic dissonance at a diminished fifth interval (tritone, $\sqrt{2} \cdot f_{\text{carrier}}$):

$$f_{\text{alert}} = f_{\text{carrier}} \cdot 2^{6/12} \approx 1.4142 \cdot f_{\text{carrier}}$$

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
├── public/
│   ├── manifest.json            # PWA Web App Manifest
│   └── sw.js                    # PWA Service Worker (CacheFirst Wasm/models)
├── src/
│   ├── engine/                  # Core math, Kalman filter, 3D orbit, sonification, VBT, TCX
│   │   ├── orbit3d.ts           # 3D Euler matrix rotation and perspective projection
│   │   ├── sonification.ts      # Web Audio FM synthesis and acoustic dissonance
│   │   ├── custom_exercise.ts   # No-code kinematic rule compiler and state machine
│   │   ├── vbt.ts               # Velocity profiles, RPE/RIR, and 1RM prediction
│   │   ├── voice_commander.ts   # Bilingual (EN/RO) Web Speech voice engine
│   │   └── tcx_exporter.ts      # Garmin/Strava schema-valid TCX XML generator
│   ├── exercises/               # 28 pluggable exercise modules across 6 suites
│   ├── components/
│   │   ├── canvas/              # Video HUD, Angle Protractor, Orbit3D HUD
│   │   ├── studio/              # Custom Exercise Studio & Dual-View Benchmark
│   │   ├── telemetry/           # Real-time metrics, VBT charts, RPE/1RM gauges
│   │   └── export/              # Session report modal, Printable PDF, CSV, TCX
│   ├── hooks/                   # React hooks for pose pipeline, audio feedback, and voice
│   ├── store/                   # Workout session, telemetry, and 3D/audio state
│   ├── App.tsx                  # Studio layout and dashboard
│   └── main.tsx                 # React 19 entrypoint and Service Worker registration
├── tests/                       # Unit tests (78 tests across 6 suites)
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
