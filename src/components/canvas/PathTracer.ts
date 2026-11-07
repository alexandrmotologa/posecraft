import { Point2D } from '../../engine/types';

export class PathTracer {
  private history: { point: Point2D; timestamp: number }[] = [];
  private maxPoints: number;
  private referenceX: number | null = null;

  constructor(maxPoints: number = 80) {
    this.maxPoints = maxPoints;
  }

  public addPoint(point: Point2D, timestamp: number): void {
    if (this.referenceX === null) {
      this.referenceX = point.x;
    }
    this.history.push({ point, timestamp });
    if (this.history.length > this.maxPoints) {
      this.history.shift();
    }
  }

  public clear(): void {
    this.history = [];
    this.referenceX = null;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    color: string = '#ec4899',
    showCorridor: boolean = false
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
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const corridorWidthNorm = 0.04;

    for (let i = 1; i < this.history.length; i++) {
      const p1 = this.history[i - 1].point;
      const p2 = this.history[i].point;

      const alpha = (i / this.history.length) * 0.9;
      const isOutsideCorridor =
        showCorridor &&
        this.referenceX !== null &&
        Math.abs(p2.x - this.referenceX) > corridorWidthNorm;

      const segmentColor = isOutsideCorridor
        ? `rgba(239, 68, 68, ${alpha})`
        : `rgba(236, 72, 153, ${alpha})`;

      ctx.strokeStyle = segmentColor;
      ctx.shadowColor = isOutsideCorridor ? '#ef4444' : color;
      ctx.shadowBlur = isOutsideCorridor ? 10 : 6;

      ctx.beginPath();
      ctx.moveTo(p1.x * canvasWidth, p1.y * canvasHeight);
      ctx.lineTo(p2.x * canvasWidth, p2.y * canvasHeight);
      ctx.stroke();
    }

    // Lead current point indicator
    const current = this.history[this.history.length - 1].point;
    ctx.beginPath();
    ctx.arc(current.x * canvasWidth, current.y * canvasHeight, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
  }
}
