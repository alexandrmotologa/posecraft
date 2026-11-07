import { Point2D } from '../../engine/types';

export class PathTracer {
  private history: { point: Point2D; timestamp: number }[] = [];
  private maxPoints: number;

  constructor(maxPoints: number = 80) {
    this.maxPoints = maxPoints;
  }

  public addPoint(point: Point2D, timestamp: number): void {
    this.history.push({ point, timestamp });
    if (this.history.length > this.maxPoints) {
      this.history.shift();
    }
  }

  public clear(): void {
    this.history = [];
  }

  public render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    color: string = '#ec4899'
  ): void {
    if (this.history.length < 2) return;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.history.length; i++) {
      const p1 = this.history[i - 1].point;
      const p2 = this.history[i].point;

      const alpha = (i / this.history.length) * 0.85;
      ctx.strokeStyle = `rgba(236, 72, 153, ${alpha})`;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

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
