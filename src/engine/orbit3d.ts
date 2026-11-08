/**
 * 3D Orbit Skeleton Engine for PoseCraft.
 * Uses MediaPipe metric 3D worldLandmarks (in meters) to render a 3D articulated skeleton
 * with interactive 360-degree orbit rotation (azimuth, elevation, zoom) and perspective projection.
 */
import { Landmark, LandmarkIndex, Point3D } from './types';

export interface OrbitCameraState {
  azimuthRad: number; // horizontal rotation (yaw)
  elevationRad: number; // vertical tilt (pitch)
  zoom: number; // scale multiplier
  panX: number; // screen offset x
  panY: number; // screen offset y
}

export type AnatomicalViewPreset = 'frontal' | 'sagittal_left' | 'sagittal_right' | 'transverse_top';

export class Orbit3DEngine {
  private camera: OrbitCameraState = {
    azimuthRad: 0,
    elevationRad: 0.15,
    zoom: 140,
    panX: 0,
    panY: 20,
  };

  public getCamera(): OrbitCameraState {
    return { ...this.camera };
  }

  public setCamera(camera: Partial<OrbitCameraState>) {
    this.camera = { ...this.camera, ...camera };
  }

  public rotate(deltaAzimuthRad: number, deltaElevationRad: number) {
    this.camera.azimuthRad += deltaAzimuthRad;
    this.camera.elevationRad = Math.max(
      -Math.PI / 2 + 0.05,
      Math.min(Math.PI / 2 - 0.05, this.camera.elevationRad + deltaElevationRad)
    );
  }

  public zoom(deltaZoom: number) {
    this.camera.zoom = Math.max(50, Math.min(350, this.camera.zoom + deltaZoom));
  }

  public pan(deltaX: number, deltaY: number) {
    this.camera.panX += deltaX;
    this.camera.panY += deltaY;
  }

  public applyPreset(preset: AnatomicalViewPreset) {
    switch (preset) {
      case 'frontal':
        this.camera.azimuthRad = 0;
        this.camera.elevationRad = 0.05;
        break;
      case 'sagittal_left':
        this.camera.azimuthRad = Math.PI / 2;
        this.camera.elevationRad = 0.05;
        break;
      case 'sagittal_right':
        this.camera.azimuthRad = -Math.PI / 2;
        this.camera.elevationRad = 0.05;
        break;
      case 'transverse_top':
        this.camera.azimuthRad = 0;
        this.camera.elevationRad = Math.PI / 2 - 0.1;
        break;
    }
  }

  public resetCamera() {
    this.camera = {
      azimuthRad: 0,
      elevationRad: 0.15,
      zoom: 140,
      panX: 0,
      panY: 20,
    };
  }

  /**
   * Projects a 3D metric world point (meters) to 2D canvas coordinates.
   */
  public projectPoint(
    point: Point3D,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number; depth: number } {
    const { azimuthRad, elevationRad, zoom, panX, panY } = this.camera;

    // 1. Rotate around Y axis (azimuth / yaw)
    const cosA = Math.cos(azimuthRad);
    const sinA = Math.sin(azimuthRad);
    const x1 = point.x * cosA + point.z * sinA;
    const y1 = point.y;
    const z1 = -point.x * sinA + point.z * cosA;

    // 2. Rotate around X axis (elevation / pitch)
    const cosE = Math.cos(elevationRad);
    const sinE = Math.sin(elevationRad);
    const x2 = x1;
    const y2 = y1 * cosE - z1 * sinE;
    const z2 = y1 * sinE + z1 * cosE;

    // 3. Perspective projection
    const cameraDistance = 2.4; // simulated camera distance in meters
    const fovScale = cameraDistance / (cameraDistance + z2);

    const centerX = canvasWidth / 2 + panX;
    const centerY = canvasHeight / 2 + panY;

    // Invert Y because canvas Y points downwards, whereas biomechanical metric Y points upwards
    const projX = centerX + x2 * zoom * fovScale;
    const projY = centerY - y2 * zoom * fovScale;

    return { x: projX, y: projY, depth: z2 };
  }

  /**
   * Renders the complete 3D articulated skeleton onto a 2D canvas context.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    worldLandmarks: Landmark[],
    width: number,
    height: number
  ) {
    if (!worldLandmarks || worldLandmarks.length < 33) return;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. Draw 3D Ground Reference Grid Plane (at ground level Y ~ -0.9m)
    this.renderGroundGrid(ctx, width, height);

    // 2. Project all 33 anatomical landmarks
    const projected: { x: number; y: number; depth: number; visibility: number }[] = [];
    for (let i = 0; i < worldLandmarks.length; i++) {
      const l = worldLandmarks[i];
      const p = this.projectPoint(l, width, height);
      projected.push({ ...p, visibility: l.visibility ?? 1.0 });
    }

    // 3. Segment bone pairs
    const BONE_CONNECTIONS: [LandmarkIndex, LandmarkIndex, string][] = [
      // Spine & Torso (emerald/teal)
      [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.RIGHT_SHOULDER, '#2dd4bf'],
      [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP, '#0d9488'],
      [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_HIP, '#0d9488'],
      [LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP, '#2dd4bf'],
      // Left Arm (sky blue)
      [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW, '#38bdf8'],
      [LandmarkIndex.LEFT_ELBOW, LandmarkIndex.LEFT_WRIST, '#0284c7'],
      // Right Arm (indigo)
      [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_ELBOW, '#818cf8'],
      [LandmarkIndex.RIGHT_ELBOW, LandmarkIndex.RIGHT_WRIST, '#4f46e5'],
      // Left Leg (cyan)
      [LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE, '#22d3ee'],
      [LandmarkIndex.LEFT_KNEE, LandmarkIndex.LEFT_ANKLE, '#0891b2'],
      [LandmarkIndex.LEFT_ANKLE, LandmarkIndex.LEFT_HEEL, '#0891b2'],
      [LandmarkIndex.LEFT_HEEL, LandmarkIndex.LEFT_FOOT_INDEX, '#22d3ee'],
      // Right Leg (amber/orange)
      [LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_KNEE, '#fbbf24'],
      [LandmarkIndex.RIGHT_KNEE, LandmarkIndex.RIGHT_ANKLE, '#d97706'],
      [LandmarkIndex.RIGHT_ANKLE, LandmarkIndex.RIGHT_HEEL, '#d97706'],
      [LandmarkIndex.RIGHT_HEEL, LandmarkIndex.RIGHT_FOOT_INDEX, '#fbbf24'],
      // Head
      [LandmarkIndex.LEFT_EAR, LandmarkIndex.NOSE, '#a78bfa'],
      [LandmarkIndex.RIGHT_EAR, LandmarkIndex.NOSE, '#a78bfa'],
    ];

    // 4. Sort bone segments by average depth (Painter's Algorithm for proper occlusion)
    const sortedBones = BONE_CONNECTIONS.map(([idxA, idxB, color]) => {
      const pA = projected[idxA];
      const pB = projected[idxB];
      const avgDepth = (pA.depth + pB.depth) / 2;
      return { idxA, idxB, color, pA, pB, avgDepth };
    }).sort((a, b) => b.avgDepth - a.avgDepth);

    // 5. Draw bones
    for (const bone of sortedBones) {
      if (bone.pA.visibility < 0.25 || bone.pB.visibility < 0.25) continue;

      // Depth cue: elements farther away are slightly darker/thinner
      const depthFactor = Math.max(0.4, Math.min(1.2, 1.0 - bone.avgDepth * 0.4));
      ctx.strokeStyle = bone.color;
      ctx.lineWidth = 2.5 * depthFactor;
      ctx.globalAlpha = Math.max(0.3, Math.min(1.0, depthFactor));

      ctx.beginPath();
      ctx.moveTo(bone.pA.x, bone.pA.y);
      ctx.lineTo(bone.pB.x, bone.pB.y);
      ctx.stroke();
    }

    // 6. Draw joint nodes
    const sortedJoints = projected
      .map((p, index) => ({ p, index }))
      .sort((a, b) => b.p.depth - a.p.depth);

    for (const { p, index } of sortedJoints) {
      if (p.visibility < 0.25) continue;

      const isKeyJoint =
        index === LandmarkIndex.LEFT_KNEE ||
        index === LandmarkIndex.RIGHT_KNEE ||
        index === LandmarkIndex.LEFT_HIP ||
        index === LandmarkIndex.RIGHT_HIP ||
        index === LandmarkIndex.LEFT_ELBOW ||
        index === LandmarkIndex.RIGHT_ELBOW;

      const radius = isKeyJoint ? 4.5 : 3.0;
      const depthFactor = Math.max(0.5, Math.min(1.2, 1.0 - p.depth * 0.4));

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = isKeyJoint ? '#38bdf8' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * depthFactor, 0, 2 * Math.PI);
      ctx.fill();

      // Outer ring on key joints
      if (isKeyJoint) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (radius + 2) * depthFactor, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    // 7. Render 3D Coordinate Axis Gizmo in corner
    this.renderCoordinateGizmo(ctx, width, height);

    ctx.restore();
  }

  private renderGroundGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const gridY = -0.92; // ground plane in meters
    const gridSize = 0.8; // +/- 0.8m grid
    const step = 0.2;

    ctx.save();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;

    for (let x = -gridSize; x <= gridSize + 0.01; x += step) {
      const p1 = this.projectPoint({ x, y: gridY, z: -gridSize }, width, height);
      const p2 = this.projectPoint({ x, y: gridY, z: gridSize }, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    for (let z = -gridSize; z <= gridSize + 0.01; z += step) {
      const p1 = this.projectPoint({ x: -gridSize, y: gridY, z }, width, height);
      const p2 = this.projectPoint({ x: gridSize, y: gridY, z }, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderCoordinateGizmo(ctx: CanvasRenderingContext2D, _width: number, height: number) {
    const gizmoOrigin = { x: 30, y: height - 30 };
    const axisLength = 18;
    const { azimuthRad, elevationRad } = this.camera;

    const cosA = Math.cos(azimuthRad);
    const sinA = Math.sin(azimuthRad);
    const cosE = Math.cos(elevationRad);
    const sinE = Math.sin(elevationRad);

    const projectVector = (vx: number, vy: number, vz: number) => {
      const x1 = vx * cosA + vz * sinA;
      const y1 = vy;
      const z1 = -vx * sinA + vz * cosA;
      const x2 = x1;
      const y2 = y1 * cosE - z1 * sinE;
      return { x: gizmoOrigin.x + x2 * axisLength, y: gizmoOrigin.y - y2 * axisLength };
    };

    const o = gizmoOrigin;
    const xAxis = projectVector(1, 0, 0);
    const yAxis = projectVector(0, 1, 0);
    const zAxis = projectVector(0, 0, 1);

    ctx.lineWidth = 2;

    // X: Red (Lateral)
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(xAxis.x, xAxis.y);
    ctx.stroke();

    // Y: Green (Vertical)
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(yAxis.x, yAxis.y);
    ctx.stroke();

    // Z: Blue (Sagittal Depth)
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(zAxis.x, zAxis.y);
    ctx.stroke();
  }
}

export const orbit3dEngine = new Orbit3DEngine();
