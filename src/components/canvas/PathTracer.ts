import { Point2D } from '../../engine/types';

export interface StickingPoint {
  point: Point2D;
  velocity: number;
  timestamp: number;
}

export class PathTracer {
  private history: { point: Point2D; timestamp: number }[] = [];
  private maxPoints: number;
  private referenceX: number | null = null;
  private detectedStickingPoint: StickingPoint | null = null;
  private userHeightMeters: number = 1.78;

  constructor(maxPoints: number = 80) {
    this.maxPoints = maxPoints;
  }

  public setUserHeight(heightMeters: number): void {
    this.userHeightMeters = Math.max(1.2, Math.min(2.3, heightMeters));
  }

  public addPoint(point: Point2D, timestamp: number): void {
    if (this.referenceX === null) {
      this.referenceX = point.x;
    }
    this.history.push({ point, timestamp });
    if (this.history.length > this.maxPoints) {
      this.history.shift();
    }

    // Evaluate sticking point (lowest velocity point during concentric ascent)
    this.updateStickingPoint();
  }

  public clear(): void {
    this.history = [];
    this.referenceX = null;
    this.detectedStickingPoint = null;
  }

  public getStickingPoint(): StickingPoint | null {
    return this.detectedStickingPoint;
  }

  private updateStickingPoint(): void {
    if (this.history.length < 8) return;

    let minVel = 999;
    let minIdx = -1;

    for (let i = 1; i < this.history.length; i++) {
      const p1 = this.history[i - 1];
      const p2 = this.history[i];
      const dt = Math.max(0.016, (p2.timestamp - p1.timestamp) / 1000);
      const dy = p1.point.y - p2.point.y; // positive dy means moving upwards (concentric ascent)

      // Only check upward concentric movement
      if (dy > 0.003) {
        const distNorm = Math.hypot(p2.point.x - p1.point.x, p2.point.y - p1.point.y);
        const distMeters = distNorm * this.userHeightMeters * 0.9;
        const vel = distMeters / dt;

        if (vel < minVel && vel < 0.40) {
          minVel = vel;
          minIdx = i;
        }
      }
    }

    if (minIdx !== -1 && minVel < 0.40) {
      this.detectedStickingPoint = {
        point: this.history[minIdx].point,
        velocity: parseFloat(minVel.toFixed(2)),
        timestamp: this.history[minIdx].timestamp,
      };
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    color: string = '#ec4899',
    showCorridor: boolean = false,
    useVelocityHeatmap: boolean = true
  ): void {
    if (this.history.length < 2) return;

    ctx.save();

    // 1. Draw Vertical Bar-Path Corridor (if enabled)
    if (showCorridor && this.referenceX !== null) {
      const refPx = this.referenceX * canvasWidth;
      const corridorWidthPx = canvasWidth * 0.04; // ~5cm corridor

      // Safe corridor box
      ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.fillRect(refPx - corridorWidthPx, 0, corridorWidthPx * 2, canvasHeight);

      // Centerline
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(refPx, 0);
      ctx.lineTo(refPx, canvasHeight);
      ctx.stroke();

      // Boundary corridor lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.moveTo(refPx - corridorWidthPx, 0);
      ctx.lineTo(refPx - corridorWidthPx, canvasHeight);
      ctx.moveTo(refPx + corridorWidthPx, 0);
      ctx.lineTo(refPx + corridorWidthPx, canvasHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Render Trajectory Segments
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const corridorWidthNorm = 0.04;

    for (let i = 1; i < this.history.length; i++) {
      const h1 = this.history[i - 1];
      const h2 = this.history[i];
      const p1 = h1.point;
      const p2 = h2.point;

      const alpha = Math.max(0.2, (i / this.history.length) * 0.95);
      const isOutsideCorridor =
        showCorridor &&
        this.referenceX !== null &&
        Math.abs(p2.x - this.referenceX) > corridorWidthNorm;

      let strokeStyle = `rgba(236, 72, 153, ${alpha})`;
      let shadowCol = color;

      if (isOutsideCorridor) {
        strokeStyle = `rgba(239, 68, 68, ${alpha})`;
        shadowCol = '#ef4444';
      } else if (useVelocityHeatmap) {
        // Calculate velocity on this segment
        const dt = Math.max(0.016, (h2.timestamp - h1.timestamp) / 1000);
        const distNorm = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const distMeters = distNorm * this.userHeightMeters * 0.9;
        const vel = distMeters / dt;

        if (vel >= 0.85) {
          strokeStyle = `rgba(6, 182, 212, ${alpha})`; // Cyan (high acceleration)
          shadowCol = '#06b6d4';
        } else if (vel >= 0.60) {
          strokeStyle = `rgba(34, 197, 94, ${alpha})`; // Green (healthy tempo)
          shadowCol = '#22c55e';
        } else if (vel >= 0.38) {
          strokeStyle = `rgba(245, 158, 11, ${alpha})`; // Amber (deceleration)
          shadowCol = '#f59e0b';
        } else {
          strokeStyle = `rgba(239, 68, 68, ${alpha})`; // Red (sticking point / grind)
          shadowCol = '#ef4444';
        }
      }

      ctx.strokeStyle = strokeStyle;
      ctx.shadowColor = shadowCol;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(p1.x * canvasWidth, p1.y * canvasHeight);
      ctx.lineTo(p2.x * canvasWidth, p2.y * canvasHeight);
      ctx.stroke();
    }

    // 3. Render Sticking Point Callout Marker (if identified)
    if (this.detectedStickingPoint && useVelocityHeatmap) {
      const spX = this.detectedStickingPoint.point.x * canvasWidth;
      const spY = this.detectedStickingPoint.point.y * canvasHeight;

      // Pulsing sticking reticle
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(spX, spY, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.fillRect(spX + 14, spY - 14, 110, 18);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.strokeRect(spX + 14, spY - 14, 110, 18);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`Sticking: ${this.detectedStickingPoint.velocity} m/s`, spX + 18, spY - 1);
    }

    // 4. Lead current point indicator
    const current = this.history[this.history.length - 1].point;
    ctx.beginPath();
    ctx.arc(current.x * canvasWidth, current.y * canvasHeight, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.fill();

    ctx.restore();
  }
}
